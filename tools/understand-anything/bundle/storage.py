"""Atomic whole-generation publication and transfer with retained rollback."""

from contextlib import contextmanager
import fcntl
import os
from pathlib import Path
import shutil
import tempfile
import uuid
from .contract import (
    ContractError,
    asset,
    envelope,
    now_utc,
    read_json,
    require,
    validate,
    write_json,
)


@contextmanager
def locked(root):
    root = Path(root).resolve()
    root.mkdir(parents=True, exist_ok=True)
    with (root / ".publication.lock").open("a") as handle:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise ContractError("another generation operation is active") from error
        try:
            yield
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def switch(root, name, target):
    temp = root / f".{name}-{uuid.uuid4()}"
    try:
        temp.symlink_to(target)
        os.replace(temp, root / name)
        try:
            fd = os.open(root, os.O_RDONLY)
            try:
                os.fsync(fd)
            finally:
                os.close(fd)
        except OSError as error:
            # Replacement already happened. A second mutation cannot guarantee
            # rollback durability on a filesystem that has just failed fsync.
            raise ContractError(
                f"PUBLICATION-DURABILITY-UNCERTAIN: {name} pointer was replaced; "
                "read back current and previous before retrying; generation bytes retained"
            ) from error
    finally:
        temp.unlink(missing_ok=True)


def _publish(stage, root, now=None):
    manifest = validate(stage, now=now)
    generation = manifest["generationId"]
    destination = root / "generations" / generation
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        validate(destination, now=now)
        require(
            (destination / "manifest.json").read_bytes()
            == (stage / "manifest.json").read_bytes(),
            "generation ID content collision",
        )
        shutil.rmtree(stage)
    else:
        for path in stage.rglob("*"):
            if path.is_file():
                with path.open("rb") as handle:
                    os.fsync(handle.fileno())
        os.rename(stage, destination)
        fd = os.open(destination.parent, os.O_RDONLY)
        try:
            os.fsync(fd)
        finally:
            os.close(fd)
    current = root / "current"
    if current.is_symlink():
        old = current.resolve()
        if old == destination.resolve():
            return manifest
        require(
            old.parent == destination.parent.resolve(),
            "current points outside generation store",
        )
        try:
            validate(old, now=now, max_age=float("inf"))
        except ContractError:
            # Retain corrupt bytes for diagnosis, but do not replace a usable rollback
            # pointer with an invalid generation or prevent a fresh valid generation.
            pass
        else:
            switch(root, "previous", os.path.relpath(old, root))
    elif current.exists():
        raise ContractError("current must be an atomic generation symlink")
    switch(root, "current", f"generations/{generation}")
    return manifest


def publish(stage, root, now=None):
    root = Path(root).resolve()
    with locked(root):
        return _publish(Path(stage), root, now)


def pull(fetch, root, now=None, expected_refs=None, check=None, channel=None):
    root = Path(root).resolve()
    now = now or now_utc()
    with locked(root):
        stage = Path(tempfile.mkdtemp(prefix=".download-", dir=root))
        try:
            fetch("current/manifest.json", stage / "manifest.json")
            manifest = read_json(stage / "manifest.json")
            envelope(manifest, now, 86400, expected_refs)
            files = manifest.get("files")
            require(isinstance(files, list) and files, "manifest files required")
            seen = set()
            for entry in files:
                name = entry.get("path")
                target = asset(stage, name)
                require(
                    name not in seen and name != "manifest.json",
                    "invalid/duplicate download path",
                )
                seen.add(name)
                target.parent.mkdir(parents=True, exist_ok=True)
                fetch(f"generations/{manifest['generationId']}/{name}", target)
            validate(stage, now=now, expected_refs=expected_refs)
            if check is not None:
                check(manifest, stage)
            result = _publish(stage, root, now)
            receipt = root / "receipts" / f"{manifest['generationId']}.json"
            pending = receipt.with_suffix(".tmp")
            write_json(
                pending,
                {
                    "generationId": manifest["generationId"],
                    "deliveredAt": now_utc().isoformat(),
                    "channel": channel,
                },
            )
            os.replace(pending, receipt)
            return result
        finally:
            if stage.exists():
                shutil.rmtree(stage)


def rollback(root, now=None):
    root = Path(root).resolve()
    with locked(root):
        require((root / "previous").is_symlink(), "no previous generation")
        require(
            (root / "current").is_symlink(),
            "no current generation symlink; inspect store before rollback",
        )
        old = (root / "current").resolve()
        target = (root / "previous").resolve()
        require(
            target.parent == (root / "generations").resolve(),
            "previous points outside generation store",
        )
        manifest = validate(target, now=now, max_age=float("inf"))
        switch(root, "current", os.path.relpath(target, root))
        switch(root, "previous", os.path.relpath(old, root))
        return manifest

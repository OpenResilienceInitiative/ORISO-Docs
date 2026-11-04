"""Repository-only visibility gate; the installed producer owns its exact vector."""
import json
from pathlib import Path
import tempfile
import unittest

REPOSITORY = Path(__file__).resolve().parents[2]
SUPPORTED = 'tools/understand-anything/bundle/public-repositories.json'
VISIBILITY = 'tools/truth-chain/public-repositories.json'


def validate_repository_policies(repository):
    supported = json.loads((repository / SUPPORTED).read_text())
    visibility = json.loads((repository / VISIBILITY).read_text())
    if supported.get('schemaVersion') != 'oriso.ua.supported-public-repositories/v1':
        raise ValueError('Unsupported producer public policy')
    names = supported.get('repositories')
    public = visibility.get('repositories')
    if (not isinstance(names, list) or not isinstance(public, list)
            or any(not isinstance(name, str) for name in names + public)
            or len(names) != len(set(names)) or len(public) != len(set(public))):
        raise ValueError('Explicit unique repository lists required')
    if not set(names) <= set(public):
        raise ValueError('Producer includes repository without canonical public visibility')


class RepositoryPublicPolicyTests(unittest.TestCase):
    def test_actual_supported_policy_has_canonical_public_visibility(self):
        validate_repository_policies(REPOSITORY)

    def test_private_inclusion_fails_instead_of_silently_excluding_the_policy_entry(self):
        with tempfile.TemporaryDirectory() as name:
            repository = Path(name)
            for path in [SUPPORTED, VISIBILITY]:
                target = repository / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes((REPOSITORY / path).read_bytes())
            target = repository / SUPPORTED
            supported = json.loads(target.read_text())
            supported['repositories'][0] = 'ORISO-Infra'
            target.write_text(json.dumps(supported))
            with self.assertRaisesRegex(ValueError, 'canonical public visibility'):
                validate_repository_policies(repository)

    def test_missing_canonical_policy_fails_instead_of_skipping(self):
        with tempfile.TemporaryDirectory() as name:
            repository = Path(name)
            target = repository / SUPPORTED
            target.parent.mkdir(parents=True)
            target.write_bytes((REPOSITORY / SUPPORTED).read_bytes())
            with self.assertRaises(FileNotFoundError):
                validate_repository_policies(repository)


if __name__ == '__main__':
    unittest.main()

import unittest
from release_event import release_input


class ReleaseEventTests(unittest.TestCase):
    def lock(self):
        return {"schemaVersion": "oriso.platform-release/v1", "documentationRevision": "a" * 40}

    def test_release_dispatch_preserves_exact_revision(self):
        lock = self.lock()
        self.assertEqual(release_input("repository_dispatch", {"action": "platform-release-published", "client_payload": {"release_manifest": lock}}), (lock, "a" * 40))

    def test_manual_release_requires_manifest(self):
        import json
        self.assertEqual(release_input("workflow_dispatch", {"inputs": {"release_manifest": json.dumps(self.lock())}})[1], "a" * 40)
        with self.assertRaises(ValueError):
            release_input("workflow_dispatch", {"inputs": {}})

    def test_dev_push_schedule_and_other_events_cannot_publish(self):
        for event in ["push", "schedule", "pull_request", "release"]:
            with self.subTest(event=event), self.assertRaises(ValueError):
                release_input(event, {"release_manifest": self.lock()})

    def test_other_dispatches_and_branch_refs_rejected(self):
        with self.assertRaises(ValueError):
            release_input("repository_dispatch", {"action": "other", "client_payload": {"release_manifest": self.lock()}})
        for revision in ["dev", "main", "refs/tags/v2.0.9", "a" * 7, "a" * 40 + "\nINJECT=1"]:
            lock = self.lock(); lock["documentationRevision"] = revision
            with self.subTest(revision=revision), self.assertRaises(ValueError):
                release_input("repository_dispatch", {"action": "platform-release-published", "client_payload": {"release_manifest": lock}})


if __name__ == "__main__":
    unittest.main()

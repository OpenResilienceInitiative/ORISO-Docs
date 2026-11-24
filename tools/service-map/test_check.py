import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import check  # noqa: E402

COVERAGE = {"mapped": {"userservice": "user"}, "excluded": {"storybook": "dev only"}}


class ServiceMapCheck(unittest.TestCase):
    def test_all_covered(self):
        self.assertEqual(check.problems({"userservice", "storybook"}, COVERAGE, {"user"}), [])

    def test_new_helm_service_fails(self):
        out = check.problems({"userservice", "storybook", "newservice"}, COVERAGE, {"user"})
        self.assertEqual(len(out), 1)
        self.assertIn("'newservice'", out[0])

    def test_mapped_box_missing_from_map_fails(self):
        out = check.problems({"userservice", "storybook"}, COVERAGE, set())
        self.assertIn("box 'user'", out[0])

    def test_removed_helm_service_fails(self):
        out = check.problems({"userservice"}, COVERAGE, {"user"})
        self.assertIn("'storybook'", out[0])

    def test_reads_templates_and_chart_dependencies(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "templates/userservice").mkdir(parents=True)
            (root / "templates/_helpers.tpl").write_text("")
            (root / "Chart.yaml").write_text(
                "name: x\ndependencies:\n  - name: redis\n    version: 1\n  - name: \"signoz\"\n"
            )
            self.assertEqual(check.helm_components(root), {"userservice", "redis", "signoz"})

    def test_reads_box_ids_from_map(self):
        html = ('const LAYERS = [\n  ["svc", "Services"], ["infra", "Infra"]\n];\n'
                '  user: { k: "svc", name: "UserService" },\n  db: { k: "infra" },\n  typo: { k: "svcc" },')
        self.assertEqual(check.map_node_ids(html), {"user", "db"})


if __name__ == "__main__":
    unittest.main()

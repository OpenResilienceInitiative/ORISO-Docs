import importlib.util
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("build-dsfa-page.py")
SPEC = importlib.util.spec_from_file_location("build_dsfa_page", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class BrandingPlaceholderTest(unittest.TestCase):
    def test_adds_offline_logo_and_favicon_placeholders(self):
        page = (
            '<html><head><title>DPIA</title></head><body><div class="appbar">'
            '<span class="appbar-logo" title="operator.logo">Logo</span></div>'
            '<div class="logo-slot" title="operator.logo">Betreiber-Logo</div></body></html>'
        )

        branded = MODULE.add_branding_placeholders(page)

        self.assertIn('id="operator-logo"', branded)
        self.assertIn('data-branding-placeholder="logo"', branded)
        self.assertIn('id="operator-favicon"', branded)
        self.assertIn('data-branding-placeholder="favicon"', branded)

    def test_live_script_applies_branding_values_from_public_master_data(self):
        script = MODULE.LIVE_MASTER_DATA_SCRIPT

        self.assertIn("m.branding", script)
        self.assertIn("theming.logo", script)
        self.assertIn("theming.favicon", script)


if __name__ == "__main__":
    unittest.main()

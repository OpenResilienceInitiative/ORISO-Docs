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


class ResponsibilityMarkerTest(unittest.TestCase):
    def test_technical_marker_renders_a_visible_badge(self):
        out = MODULE.render(":::technisch\n\nText.")

        self.assertIn('class="scope scope--tech"', out)
        self.assertIn("Technischer Teil — von ORISO gepflegt", out)
        self.assertIn("<p>Text.</p>", out)
        self.assertNotIn(":::", out)

    def test_organisational_marker_carries_its_note(self):
        out = MODULE.render(":::organisatorisch Bearbeitung im Administrationsbereich folgt")

        self.assertIn('class="scope scope--org"', out)
        self.assertIn("Organisatorischer Teil — vom Plattformbetreiber gepflegt (Vertragsunterlagen)", out)
        self.assertIn(
            '<span class="scope-note">Bearbeitung im Administrationsbereich folgt</span>', out
        )

    def test_organisational_wrapper_collapses_the_draft_behind_a_placeholder(self):
        out = MODULE.organisational("<p>Entwurf mit [Lücke].</p>")

        self.assertIn('class="scope scope--org"', out)
        self.assertIn('class="scope-placeholder"', out)
        self.assertIn('<details class="org-draft">', out)
        # Der halbfertige Entwurf steht nicht mehr im Lesefluss, sondern eingeklappt.
        self.assertLess(out.index("scope-placeholder"), out.index("Entwurf mit [Lücke]."))

    def test_scope_badge_is_inserted_after_the_chapter_heading(self):
        block = '      <section id="kap3">\n        <h2>Kennzahlen</h2>\n        <p>x</p>\n'

        out = MODULE.add_scope_to_section(block, "organisatorisch", "aus dem Admin")

        self.assertIn("</h2>\n", out)
        self.assertLess(out.index("</h2>"), out.index("scope--org"))
        self.assertLess(out.index("scope--org"), out.index("<p>x</p>"))

    def test_every_chapter_source_declares_its_responsibility(self):
        for path in sorted(MODULE.SRC.glob("kap-*.md")):
            with self.subTest(chapter=path.name):
                self.assertRegex(
                    path.read_text(encoding="utf-8"),
                    r"(?m)^:::(technisch|organisatorisch)",
                )


class VersioningTest(unittest.TestCase):
    PAGE = (
        '<span class="appbar-version">v0.1-draft · 14.08.2026</span>\n'
        'Diese Version: <code>/docs/dsfa/v0.1-draft/</code>\n'
        '<div class="vlabel">Version</div>\n<div class="vvalue">0.1-draft</div>\n'
        '<div class="vlabel">Stand</div>\n<div class="vvalue">14.08.2026</div>\n'
        '<a class="btn-pdf" download="dsfa-oriso-v0.1-draft.pdf">PDF</a>\n'
        '<span class="latest-url">latest → v0.1-draft</span>\n'
        '<thead><tr><th>Version</th><th>Datum</th><th>Änderung</th>'
        '<th>Bearbeitung</th></tr></thead>\n<tbody>'
        '<tr><td>0.1-draft</td><td>14.08.2026</td><td>Erstfassung.</td><td>ORISO Docs</td></tr>'
        '</tbody>'
    )
    VERSIONS = [
        {"version": "0.1-draft", "date": "2026-08-14", "change": "Erstfassung.",
         "editor": "ORISO Docs"},
        {"version": "4", "date": "2026-09-05", "change": "Zweite Fassung.",
         "editor": "ORISO Docs"},
    ]

    def test_versions_file_parses_and_ends_with_the_current_release(self):
        versions = MODULE.read_versions()
        self.assertGreaterEqual(len(versions), 2)
        for entry in versions:
            self.assertIn("version", entry)
            self.assertIn("date", entry)
            self.assertIn("change", entry)
            self.assertIn("editor", entry)

    def test_display_date_formats_iso_as_german(self):
        self.assertEqual(MODULE.display_date("2026-09-05"), "05.09.2026")

    def test_apply_versioning_bumps_version_block_and_header(self):
        out = MODULE.apply_versioning(self.PAGE, self.VERSIONS)

        self.assertIn('<div class="vvalue">4</div>', out)
        self.assertIn('<div class="vvalue">05.09.2026</div>', out)
        self.assertIn('<span class="appbar-version">v4 · 05.09.2026</span>', out)
        self.assertIn('Diese Version: <code>/docs/dsfa/v4/</code>', out)
        self.assertIn('download="dsfa-oriso-v4.pdf"', out)
        self.assertIn('<span class="latest-url">latest → v4</span>', out)

    def test_apply_versioning_lists_every_version_newest_first_in_history(self):
        out = MODULE.apply_versioning(self.PAGE, self.VERSIONS)

        row4 = out.index("<td>4</td>")
        row01 = out.index("<td>0.1-draft</td>")
        self.assertLess(row4, row01)
        self.assertIn("Zweite Fassung.", out)
        self.assertIn("Erstfassung.", out)


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""
Baut die Kapitelstrecke der DSFA-Seite aus den Kapiteltexten.

  Quelle der Texte : ORISO-Docs/oriso-platform/dsfa-text/*.md   (Single Source of Truth)
  Vorlage (Rahmen) : dsfa-page-v2.html
  Ergebnis         : dsfa-page-v3.html

Ersetzt wird ausschliesslich der Bereich zwischen <section id="kap1"> und dem
Endnoten-Block. Kopf, Stile, Icon-Sprite, JavaScript, EVIDENCE/CODE, Dialoge und
Fusszeile bleiben Byte-fuer-Byte erhalten.

Kapitelnummerierung folgt dem Original (DCV-DSFA 29.01.2026) — dieselbe Nummerierung
wie die Quelltexte und die Slots des DSFA-Editors im Administrationsbereich.
"""

import html
import os
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE.parent / "oriso-platform" / "dsfa-text"
TEMPLATE = Path(os.environ.get("DSFA_TEMPLATE",
    Path.home() / "ORISO/0 - Docs/artifacts/dsfa-2026-08-13/dsfa-page-v2.html"))
OUT = Path(os.environ.get("DSFA_OUT", HERE.parent / "dsfa-page.html"))

# ---------------------------------------------------------------- Inline-Auszeichnung

# "§ 35 KDG (Art. 35 DSGVO)" bzw. "§ 17 KDG / Art. 15 DSGVO" -> Preset-Umschalter.
NORM_PAREN = re.compile(r"(§[^()]{1,40}?KDG)\s*\((Art\.[^()]{1,40}?DSGVO)\)")
NORM_SLASH = re.compile(r"(§[^()/]{1,40}?KDG)\s*/\s*(Art\.[^()/]{1,40}?DSGVO)")


def norm_switch(text: str) -> str:
    """Normzitate in den KDG/DSGVO-Umschalter der Seite ueberfuehren."""
    def repl(m):
        return (
            '<span class="norm"><span class="n-kdg">%s</span>'
            '<span class="n-dsgvo">%s</span></span>' % (m.group(1).strip(), m.group(2).strip())
        )

    return NORM_SLASH.sub(repl, NORM_PAREN.sub(repl, text))


def inline(text: str) -> str:
    """Markdown-Inline -> HTML. Reihenfolge: escapen, Code, fett, kursiv, Normen."""
    out = html.escape(text, quote=False)
    out = re.sub(r"`([^`]+)`", lambda m: "<code>%s</code>" % m.group(1), out)
    out = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", out)
    out = re.sub(r"(?<![\w*])\*([^*\n]+)\*(?![\w*])", r"<em>\1</em>", out)
    out = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', out)
    out = out.replace("--", "—") if False else out
    return norm_switch(out)


# ---------------------------------------------------------------- Blockrenderer


def render(md: str, heading_base: int = 3) -> str:
    """Markdown-Bloecke -> HTML im Idiom der Seite.

    heading_base: '## x' wird zu h<base>, '### x' zu h<base+1>.
    """
    lines = md.split("\n")
    out: list[str] = []
    i = 0
    para: list[str] = []

    def flush_para():
        if not para:
            return
        text = " ".join(para).strip()
        para.clear()
        # "*Hinweis (vor Veröffentlichung entfernen): …*" ist kein Dokumenttext, sondern
        # die Ausfüllhilfe für den Betreiber — sichtbar, aber klar abgesetzt.
        m_hint = re.match(r"^\*Hinweis \(vor Veröffentlichung entfernen\):\s*(.*)\*$", text, re.S)
        if m_hint:
            out.append(
                '<div class="qnote qnote--todo"><span class="tag">Vom Betreiber auszufüllen</span>'
                "<p>%s</p></div>" % inline(m_hint.group(1).strip())
            )
            return
        out.append("<p>%s</p>" % inline(text))

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            flush_para()
            i += 1
            continue

        # Thematische Trennlinie der Vorlagen — im Dokument bedeutungslos
        if re.fullmatch(r"-{3,}|\*{3,}|_{3,}", stripped):
            flush_para()
            i += 1
            continue

        # Überschriften
        m = re.match(r"^(#{2,4})\s+(.*)$", stripped)
        if m:
            flush_para()
            level = heading_base + len(m.group(1)) - 2
            title = m.group(2).strip()
            # "8.1 — Identitätsüberprüfung (`identityCheck`)" -> Slot-Kennung raus
            title = re.sub(r"\s*\(`[^`]+`\)\s*$", "", title)
            title = title.replace(" — ", " ")
            out.append("<h%d>%s</h%d>" % (level, inline(title), level))
            i += 1
            continue

        # Tabelle
        if stripped.startswith("|"):
            flush_para()
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                rows.append(lines[i].strip())
                i += 1
            out.append(render_table(rows))
            continue

        # Zitatblock -> sichtbarer Hinweiskasten (kein .internal-note, das ist ausgeblendet)
        if stripped.startswith(">"):
            flush_para()
            buf = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                buf.append(re.sub(r"^\s*>\s?", "", lines[i]))
                i += 1
            inner = render("\n".join(buf), heading_base)
            out.append('<div class="qnote">%s</div>' % inner)
            continue

        # Listen
        if re.match(r"^[-*]\s+", stripped) or re.match(r"^\d+\.\s+", stripped):
            flush_para()
            ordered = bool(re.match(r"^\d+\.\s+", stripped))
            items: list[str] = []
            while i < len(lines):
                cur = lines[i]
                s = cur.strip()
                if not s:
                    # Leerzeile beendet die Liste nur, wenn danach kein Listeneintrag folgt
                    nxt = lines[i + 1].strip() if i + 1 < len(lines) else ""
                    if re.match(r"^[-*]\s+", nxt) or re.match(r"^\d+\.\s+", nxt):
                        i += 1
                        continue
                    break
                m2 = re.match(r"^[-*]\s+(.*)$", s) or re.match(r"^\d+\.\s+(.*)$", s)
                if m2:
                    items.append(m2.group(1))
                elif items and (cur.startswith("  ") or cur.startswith("\t")):
                    items[-1] += " " + s  # Fortsetzungszeile
                else:
                    break
                i += 1
            tag = "ol" if ordered else "ul"
            out.append(
                "<%s>%s</%s>" % (tag, "".join("<li>%s</li>" % inline(x) for x in items), tag)
            )
            continue

        para.append(stripped)
        i += 1

    flush_para()
    return "\n".join(out)


def render_table(rows: list[str]) -> str:
    def cells(row: str) -> list[str]:
        return [c.strip() for c in row.strip().strip("|").split("|")]

    if len(rows) < 2:
        return ""
    header = cells(rows[0])
    body = [cells(r) for r in rows[2:]]  # rows[1] ist die Trennzeile
    head_html = "".join("<th>%s</th>" % inline(c) for c in header)
    body_html = "".join(
        "<tr>%s</tr>" % "".join("<td>%s</td>" % inline(c) for c in r) for r in body
    )
    return (
        '<div class="table-scroll"><table>'
        "<thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>" % (head_html, body_html)
    )


# ---------------------------------------------------------------- Quelltexte


def read(name: str) -> str:
    return (SRC / name).read_text(encoding="utf-8")


def body_of(md: str) -> str:
    """H1 und alles davor abschneiden."""
    m = re.search(r"^# .*$", md, re.M)
    return md[m.end():].lstrip("\n") if m else md


def slice_sections(md: str, first: str, last: str | None = None) -> str:
    """Abschnitte von '## <first>' bis ausschliesslich '## <last>' herausschneiden."""
    lines = md.split("\n")
    start = next(i for i, l in enumerate(lines) if l.startswith("## " + first))
    if last is None:
        end = len(lines)
    else:
        end = next(i for i, l in enumerate(lines) if l.startswith("## " + last))
    return "\n".join(lines[start:end])


def template_section(md: str, key: str) -> str:
    """Einen Betreiber-Vorlagenabschnitt ('## 4 — Akteure …') ohne seine Überschrift."""
    lines = md.split("\n")
    start = next(i for i, l in enumerate(lines) if l.startswith("## " + key + " —"))
    end = next(
        (i for i in range(start + 1, len(lines)) if lines[i].startswith("## ")), len(lines)
    )
    return "\n".join(lines[start + 1: end])


# ---------------------------------------------------------------- Stammdaten

# Die Seite fuehrt die Betreiber-Stammdaten in <span class="dyn" title="…">-Feldern.
# Fachliche Quelle ist die Karte „Dokument-Stammdaten" im Administrationsbereich
# (ORISO-Admin#736) auf dem Bestand des TenantService (#187, Tabelle
# platform_dpia_master_data, oeffentlich lesbar ueber GET /tenant/public/dpia).
# Solange die Seite diesen Endpunkt nicht selbst abfragt, traegt sie den hier
# gepflegten Vorgabesatz — dieselben Werte wie die Storybook-Story der Karte.
# Schluessel = title-Attribut des Feldes.
MASTER_DATA: dict[str, str] = {
    "aus Admin-Panel Global Settings: operator.legalName": "Deutscher Caritasverband e.&nbsp;V.",
    "aus Admin-Panel Global Settings: operator.address": "Karlstraße 40, 79104 Freiburg im Breisgau",
    "aus Admin-Panel Global Settings: operator.contact":
        "datenschutz@caritas.example · +49&nbsp;761&nbsp;200-0",
    "aus Admin-Panel Global Settings: operator.dpoName": "Stabsstelle Datenschutz",
    "aus Admin-Panel Global Settings: operator.department": "Referat Online-Beratung",
    "aus Admin-Panel Global Settings: legal.supervisoryAuthority":
        "Katholisches Datenschutzzentrum Frankfurt, Hausener Weg 66, 60489 Frankfurt am Main",
    "aus Admin-Panel Global Settings: document.nextReviewDate": "01.06.2027",
}

# Auftragsverarbeiter aus dem unterzeichneten TOM-Bogen zum AVV
# (0 - Docs/Anh3_TOM_zum_AVV_GS-Design_SJA_ORISO_ausgefuellt_2026-08-14.docx, Abschnitt 1.1).
PROCESSOR_ROWS = (
    '<tr><td><span class="dyn" title="aus Admin-Panel: processors[] — Wiederholgruppe">'
    "GS Design GmbH</span><br><span class=\"muted\">Kreuzbergstr. 30 VH, 10965 Berlin</span></td>"
    "<td>Entwicklung, Wartung, Support</td><td>Deutschland</td><td>Nein</td><td>Ja</td><td>Ja</td></tr>"
    '<tr><td><span class="dyn" title="aus Admin-Panel: processors[] — Wiederholgruppe">'
    "Greyt.IT UG</span><br><span class=\"muted\">Richardstr. 11, 12043 Berlin — Subunternehmen "
    "der GS Design GmbH</span></td>"
    "<td>Technische Entwicklung</td><td>Deutschland</td><td>Nein</td><td>Ja</td><td>Ja</td></tr>"
)

# Zusatz zur Auftragsverarbeitertabelle: Feststellung aus demselben TOM-Bogen.
PROCESSOR_NOTE = (
    '<p class="muted" style="margin-top:8px">Von den Entwicklungsarbeitsplätzen besteht kein '
    "Zugriff auf personenbezogene Produktivdaten; Entwicklung und Test arbeiten ausschließlich "
    "mit synthetischen Daten. Produktivbetrieb und Administration liegen beim Betriebsdienstleister "
    "im Rechenzentrum (Anhang 3 zum Auftragsverarbeitungsvertrag, Stand 14.08.2026).</p>"
)


def fill_master_data(page: str) -> tuple[str, int]:
    """Vorgabewerte in die dyn-Felder schreiben; gibt (Seite, Anzahl) zurueck."""
    count = 0

    def repl(m):
        nonlocal count
        key, current = m.group(1), m.group(2)
        value = MASTER_DATA.get(key)
        if value is None or value == current:
            return m.group(0)
        count += 1
        return '<span class="dyn" title="%s">%s</span>' % (key, value)

    page = re.sub(r'<span class="dyn" title="([^"]*)">([^<]*)</span>', repl, page)

    # Platzhalterzeile der Auftragsverarbeitertabelle durch die vertraglich benannten
    # Entwicklungsdienstleister ersetzen.
    m = re.search(r"<tr>(?:(?!</tr>).)*Entwicklungs-/Supportdienstleister.*?</tr>", page, re.S)
    if m:
        page = page[: m.start()] + PROCESSOR_ROWS + page[m.end():]
        count += 2
        end_table = page.find("</table>", m.start())
        close = page.find("</div>", end_table)
        if close > 0:
            page = page[: close + len("</div>")] + PROCESSOR_NOTE + page[close + len("</div>"):]

    # Kopf- und Fusszeile des Druck-Layouts fuehren denselben Namen wie das Dokument.
    operator = MASTER_DATA["aus Admin-Panel Global Settings: operator.legalName"].replace("&nbsp;", " ")
    page = re.sub(r'(@top-right\s*\{ content: ")[^"]*(")', lambda x: x.group(1) + operator + x.group(2), page)
    page = re.sub(r'(@bottom-left\s*\{ content: ")[^"]*( · Datenschutz)',
                  lambda x: x.group(1) + operator + x.group(2), page)
    return page, count


# ---------------------------------------------------------------- Schwellwert-Checkliste

CBX_ON = ('<span class="cbx"><svg class="ico" aria-hidden="true" focusable="false">'
          '<use href="#ms-check_box"/></svg></span>')
CBX_OFF = ('<span class="cbx empty"><svg class="ico" aria-hidden="true" focusable="false">'
           '<use href="#ms-check_box_outline_blank"/></svg></span>')


def pull_table(md: str, after_heading: str) -> tuple[list[list[str]], str]:
    """Erste Tabelle nach einer Überschrift herausloesen; gibt (Zeilen, Rest-Markdown)."""
    lines = md.split("\n")
    start = next(i for i, l in enumerate(lines) if l.startswith("## " + after_heading))
    t0 = next(i for i in range(start, len(lines)) if lines[i].strip().startswith("|"))
    t1 = next((i for i in range(t0, len(lines)) if not lines[i].strip().startswith("|")), len(lines))
    rows = [[c.strip() for c in l.strip().strip("|").split("|")] for l in lines[t0:t1]]
    del rows[1]  # Trennzeile
    rest = "\n".join(lines[:t0] + lines[t1:])
    return rows, rest


def checklist(rows: list[list[str]], head: str, question_col: int, norm_col: int | None) -> str:
    """Fragetabelle der Quelltexte in das Checklisten-Bauteil der Seite ueberfuehren."""
    out = ['<div class="checklist"><div class="cl-head">%s</div>' % inline(head)]
    for r in rows[1:]:
        answer_cell = r[-1]
        yes = "☒ Ja" in answer_cell
        q = inline(r[question_col])
        if norm_col is not None and len(r) > norm_col and r[norm_col]:
            q += " " + inline(r[norm_col])  # Normchip ohne Klammern — er ist optisch abgesetzt
        out.append(
            '<div class="cl-row">%s<span>%s</span><span class="cl-answer%s">%s</span></div>'
            % (CBX_ON if yes else CBX_OFF, q, "" if yes else " nein", "Ja" if yes else "Nein")
        )
    out.append("</div>")
    return "".join(out)


def threshold_widget(vor: list[list[str]], pruef: list[list[str]], result: str) -> str:
    return (
        '<details class="threshold">\n'
        "  <summary>\n"
        '    <span class="sum-kicker">Ergebnis</span>\n'
        "    <span>DSFA erforderlich — durchgeführt "
        '<svg class="ico" aria-hidden="true" focusable="false"><use href="#ms-task_alt"/></svg></span>\n'
        '    <span class="expander" aria-hidden="true">'
        '<svg class="ico" aria-hidden="true" focusable="false"><use href="#ms-expand_more"/></svg></span>\n'
        "  </summary>\n"
        '  <div class="threshold-body">\n    %s\n    %s\n    %s\n  </div>\n'
        "</details>"
        % (
            checklist(vor, "Vorfragen", 0, 1),
            checklist(pruef, "Prüffragen (WP-248-Kriterien) — DSFA erforderlich, "
                             "wenn zwei oder mehr bejaht werden", 1, None),
            result,
        )
    )


# ---------------------------------------------------------------- Evidenz-Anker

# Die 18 vorhandenen ⓘ-Belege der Seite werden an ihre Aussage im neuen Text gehaengt.
# key -> Textstelle, HINTER der der Knopf erscheint (erste Fundstelle im Kapitel).
EVIDENCE_ANCHORS: dict[str, tuple[str, str]] = {
    # Kapitel 6 — Verfahren und Technik
    "megolm": ("6", "Megolm-Verfahren (<code>m.megolm.v1.aes-sha2</code>)"),
    "vodozemac": ("6", "offenen Kommunikationsprotokoll <strong>Matrix</strong>"),
    "e2ee-enforced": ("6", "ein unverschlüsselter Sendepfad existiert\nnicht"),
    "attachment": ("6", "clientseitig mit einem einmaligen AES-256"),
    "federation": ("6", "Verbund mit fremden Matrix-Servern ist bewusst deaktiviert"),
    "altsystem": ("6", "Vorgängerdokumentation"),
    "otp": ("6", "Als zweiter Faktor stehen eine Authenticator-Anwendung"),
    "voiceflags": ("6", "je Träger und Chat-Typ abschaltbar"),
    "blur": ("6", "unkenntlich (unscharf) angezeigt"),
    "scannerpoc": ("6", "geprüfter, standardmäßig deaktivierter Proof of Concept"),
    "teamdisc": ("6", "Team-Besprechung"),
    "handover": ("6", "Fallübergabe"),
    "livekit": ("6", "Aufzeichnung ist nicht konfiguriert"),
    "notif": ('6', 'Vorschaumodus ist in allen Umgebungen fest auf'),
    "notracking": ("6", "verzichtet vollständig auf Tracking"),
    "suppression": ("6", "Kleinstzellen-Unterdrückung"),
    "hmac": ("6", "HMAC-SHA256 über die Beraterkennung"),
    # Kapitel 8 — Betroffenenrechte
    "delete": ("8", "Die Kontolöschung durchläuft ein Schutzfenster"),
}

EV_BUTTON = (
    '<button class="ev" data-ev="%s" title="Evidenz anzeigen">'
    '<svg class="ico ico-ev" aria-hidden="true" focusable="false"><use href="#ms-info"/></svg>'
    "</button>"
)


def attach_evidence(html_text: str, chapter: str) -> tuple[str, list[str]]:
    """Belegknoepfe an ihre Aussage haengen. Gibt (HTML, nicht platzierte Schluessel) zurueck."""
    missing = []
    for key, (chap, anchor) in EVIDENCE_ANCHORS.items():
        if chap != chapter:
            continue
        pattern = re.compile(r"\s+".join(re.escape(w) for w in anchor.split()))
        m0 = pattern.search(html_text)
        if not m0:
            missing.append(key)
            continue
        idx, anchor_len = m0.start(), m0.end() - m0.start()
        # Hinter das Satzende nach dem Anker setzen (Punkt/Semikolon), sonst direkt dahinter.
        tail = html_text[idx + anchor_len:]
        m = re.search(r"[.;]", tail)
        cut = idx + anchor_len + (m.end() if m and m.start() < 200 else 0)
        html_text = html_text[:cut] + EV_BUTTON % key + html_text[cut:]
    return html_text, missing


# ---------------------------------------------------------------- Kapitelaufbau

MEASURES = {
    "6": [
        ("lock", "E2EE Olm / Megolm"),
        ("shield", "TLS-Transportverschlüsselung"),
        ("verified_user", "2FA für Beratende"),
        ("auto_delete", "Anonyme Konten zeitgesteuert gelöscht"),
    ],
}


def measures_html(chapter: str) -> str:
    chips = MEASURES.get(chapter)
    if not chips:
        return ""
    return '<div class="measures">%s</div>' % "".join(
        '<span class="measure"><svg class="ico" aria-hidden="true" focusable="false">'
        '<use href="#ms-%s"/></svg> %s</span>' % (icon, text)
        for icon, text in chips
    )


def section(num: str, title: str, inner: str, chapter_label: str | None = None) -> str:
    label = chapter_label or ("Kapitel " + num)
    return (
        '      <!-- ——— %s ——— -->\n'
        '      <section id="kap%s">\n'
        '        <span class="chapter-no">%s</span>\n'
        "        <h2>%s</h2>\n"
        "%s\n"
        "      </section>\n" % (label, num, label, title, indent(inner))
    )


def indent(block: str) -> str:
    return "\n".join("        " + l if l.strip() else l for l in block.split("\n"))


def main() -> int:
    page = TEMPLATE.read_text(encoding="utf-8")

    start = page.index('      <!-- ——— Kapitel 1 ——— -->')
    end = page.index("      <!-- ——— Endnoten")
    head, tail = page[:start], page[end:]
    old = page[start:end]

    def keep(kid: str) -> str:
        m = re.search(r'( *<!-- ——— [^\n]*——— -->\n)?( *<section id="%s">.*?</section>\n)' % kid, old, re.S)
        return m.group(2)

    def renumber(block: str, new_num: str, new_title: str | None = None) -> str:
        block = re.sub(r'<section id="kap\d+">', '<section id="kap%s">' % new_num, block)
        block = re.sub(
            r'<span class="chapter-no">Kapitel \d+</span>',
            '<span class="chapter-no">Kapitel %s</span>' % new_num,
            block,
        )
        if new_title:
            block = re.sub(r"<h2>.*?</h2>", "<h2>%s</h2>" % new_title, block, count=1)
        return block

    vorlagen = read("vorlagen-betreiber.md")
    chapters: list[str] = []
    unplaced: list[str] = []

    # 1 — Einleitung, Scope und Stammdaten (unveraendert)
    chapters.append(keep("kap1"))

    # 2 — Schwellwertanalyse: Fragetabellen werden zum Checklisten-Bauteil der Seite,
    # die Herleitung bleibt als Fliesstext darunter stehen.
    md2 = body_of(read("kap-02-schwellwertanalyse.md"))
    vor, md2 = pull_table(md2, "2.1")
    pruef, md2 = pull_table(md2, "2.2")
    result_p = ('<p style="margin:12px 0 14px">Eine DSFA <strong>ist durchzuführen</strong>: '
                "Es sind besondere Kategorien personenbezogener Daten "
                + norm_switch("§ 11 KDG (Art. 9 DSGVO)")
                + " zu erwarten, die Plattform richtet sich an eine große Zahl teils besonders "
                  "schutzbedürftiger Ratsuchender, und mehrere Verantwortliche wirken zusammen.</p>")
    k2 = threshold_widget(vor, pruef, result_p) + "\n" + render(md2)
    k2 += "\n" + render(template_section(vorlagen, "2"))
    chapters.append(section("2", "Schwellwertanalyse", k2))

    # 3 — Kontext und Kennzahlen (unveraendert)
    chapters.append(keep("kap3"))

    # 4 — Akteure, Rollen und Berechtigungen (Seite) + Governance-Vorlage
    k4 = keep("kap4")
    # Kapitel 5 heisst jetzt "Verantwortlichkeit" — Kapitel 4 darf den Begriff nicht doppeln.
    k4 = k4.replace("<h2>Akteure und Verantwortlichkeit</h2>", "<h2>Akteure, Rollen und Governance</h2>")
    gov = indent("<h3>4.5 Governance und Entscheidungsgremien</h3>\n"
                 + render(template_section(vorlagen, "4"), heading_base=4))
    k4 = k4.replace("      </section>\n", gov + "\n      </section>\n")
    chapters.append(k4)

    # 5 — Verantwortlichkeit
    chapters.append(section("5", "Verantwortlichkeit", render(template_section(vorlagen, "5"))))

    # 6 — Verfahren und Technik
    k6 = render(body_of(read("kap-06-verfahren-und-technik.md")))
    k6, miss = attach_evidence(k6, "6")
    unplaced += miss
    # Übersichtstabelle Datenkategorien aus dem bisherigen Kapitel 7 uebernehmen
    old7 = keep("kap7")
    inner7 = re.search(r"<h2>.*?</h2>(.*)</section>", old7, re.S).group(1).strip()
    k6 += "\n<h3>6.19 Übersicht der Datenkategorien und Empfänger</h3>\n" + inner7
    chapters.append(section("6", "Verfahren und Technik", measures_html("6") + "\n" + k6))

    # 7 — Rechtsgrundlagen
    chapters.append(
        section("7", "Rechtsgrundlagen", render(body_of(read("kap-07-rechtsgrundlagen.md"))))
    )

    # 8 — Betroffenenrechte (Betreiber-Slots 8.1/8.3/8.11 + eigene Kapitel 8.4–8.12)
    k8 = "<h3>8.1 Identitätsüberprüfung</h3>\n" + render(template_section(vorlagen, "8.1"))
    k8 += "\n<h3>8.3 Datenschutzhinweise und Informationswege</h3>\n" + render(
        template_section(vorlagen, "8.3")
    )
    k8 += "\n" + render(body_of(read("kap-08-betroffenenrechte.md")))
    k8 += "\n<h3>8.11 Eskalationskette und Datenweitergabe an Ermittlungsbehörden</h3>\n" + render(
        template_section(vorlagen, "8.11")
    )
    k8, miss = attach_evidence(k8, "8")
    unplaced += miss
    chapters.append(section("8", "Betroffenenrechte", k8))

    # 9 — Verhältnismäßigkeit
    k9 = ""
    for key, title in [
        ("9.1", "9.1 Legitimer Zweck"),
        ("9.2", "9.2 Geeignetheit"),
        ("9.3", "9.3 Erforderlichkeit"),
        ("9.4", "9.4 Angemessenheit"),
    ]:
        k9 += "<h3>%s</h3>\n%s\n" % (title, render(template_section(vorlagen, key)))
    chapters.append(section("9", "Verhältnismäßigkeit", k9))

    # 10 — Ergebnis
    chapters.append(
        section("10", "Ergebnis der Datenschutz-Folgenabschätzung",
                render(body_of(read("kap-10-ergebnis.md"))))
    )

    # Anlage 1 — Risiken und Maßnahmen (bisheriges Kapitel 10 der Seite)
    a1 = renumber(keep("kap10"), "A1", "Anlage 1 — Risiken und Maßnahmen (Entwurf)")
    a1 = a1.replace('<span class="chapter-no">Kapitel A1</span>',
                    '<span class="chapter-no">Anlage 1</span>')
    chapters.append(a1)

    # Anlagenverzeichnis
    chapters.append(
        section("A", "Anlagenverzeichnis", render(template_section(vorlagen, "A")),
                chapter_label="Anlagen")
    )

    new_body = "\n".join(chapters)

    # Navigation und Inhaltsverzeichnis neu setzen
    nav_items = [
        # (Anker, Icon, Kurzlabel für die Kapitelleiste, Volltitel für das Inhaltsverzeichnis)
        ("kap1", "flag", "1 Scope", "Einleitung, Scope &amp; Stammdaten"),
        ("kap2", "rule", "2 Schwellwert", "Schwellwertanalyse"),
        ("kap3", "bar_chart", "3 Kennzahlen", "Kontext &amp; Kennzahlen"),
        ("kap4", "groups", "4 Akteure &amp; Rollen", "Akteure, Rollen &amp; Governance"),
        ("kap5", "verified_user", "5 Verantwortlichkeit", "Verantwortlichkeit"),
        ("kap6", "memory", "6 Technik", "Verfahren &amp; Technik"),
        ("kap7", "gavel", "7 Rechtsgrundlagen", "Rechtsgrundlagen"),
        ("kap8", "how_to_reg", "8 Betroffenenrechte", "Betroffenenrechte"),
        ("kap9", "balance", "9 Verhältnismäßigkeit", "Verhältnismäßigkeit"),
        ("kap10", "task_alt", "10 Ergebnis", "Ergebnis"),
        ("kapA1", "warning", "Anlage 1", "Anlage 1 — Risiken &amp; Maßnahmen"),
        ("kapA", "attach_file", "Anlagen", "Anlagenverzeichnis"),
    ]
    nav_html = "".join(
        '<a href="#%s"><svg class="ico" aria-hidden="true" focusable="false">'
        '<use href="#ms-%s"/></svg>%s</a>' % (i, ico, short) for i, ico, short, _ in nav_items
    )
    head = re.sub(
        r'(<div class="chipnav-inner">\s*).*?(\s*</div>)',
        lambda m: m.group(1) + nav_html + m.group(2), head, flags=re.S,
    )
    toc_html = "\n".join(
        '<li><a href="#%s">%s</a></li>' % (i, full) for i, _, _, full in nav_items
    )
    head = re.sub(
        r'(<nav class="toc"[^>]*>.*?<ol>\s*).*?(\s*</ol>)',
        lambda m: m.group(1) + toc_html + m.group(2), head, flags=re.S,
    )

    # Stil für Hinweiskästen aus Zitatblöcken ergänzen (einmalig)
    if ".qnote" not in head:
        head = head.replace(
            "  .internal-note {",
            "  .qnote--todo { border-left-color: var(--anno-ink,#b26a00); background: #fff8ec; }\n"
            "  .qnote--todo .tag { display: inline-block; margin-bottom: 6px; font: 600 10px/1.4 var(--mono,monospace);\n"
            "        letter-spacing: .04em; text-transform: uppercase; color: var(--anno-ink,#b26a00); }\n"
            "  .qnote { margin: 14px 0; padding: 12px 16px; border-left: 3px solid var(--m3-outline,#b9c0c8);\n"
            "           background: var(--m3-surface-container-low,#f4f6f8); border-radius: 0 8px 8px 0; }\n"
            "  .qnote p:first-child { margin-top: 0; } .qnote p:last-child { margin-bottom: 0; }\n"
            "  .internal-note {",
            1,
        )

    page_out, filled = fill_master_data(head + new_body + tail)
    OUT.write_text(page_out, encoding="utf-8")

    words = len(re.sub(r"<[^>]+>", " ", new_body).split())
    print("Stammdatenfelder gefüllt: %d" % filled)
    print("geschrieben: %s" % OUT.name)
    print("Kapitelstrecke: %d Wörter (vorher %d)"
          % (words, len(re.sub(r"<[^>]+>", " ", old).split())))
    print("Normumschalter: %d" % new_body.count('class="norm"'))
    print("Belegknöpfe: %d von %d" % (new_body.count("data-ev="), len(EVIDENCE_ANCHORS) + 1))
    if unplaced:
        print("NICHT platziert: %s" % ", ".join(unplaced))
    return 0


if __name__ == "__main__":
    sys.exit(main())

// Only fixed template prose is localized. Repository names, endpoint paths,
// source refs/SHAs and quoted evidence remain the exact producer data.
const terms = [
 ['Source generation provenance','Herkunft der Quellgeneration'],
 ['Generation:','Generation:'],
 ["These are the producer's declared source refs. A Dev or mixed Dev/main generation does not prove a released-main artifact, live deployment or legal approval.", 'Dies sind die vom Erzeuger angegebenen Quellreferenzen. Eine Dev- oder gemischte Dev/main-Generation belegt weder ein Release-Artefakt aus main noch eine Live-Bereitstellung oder rechtliche Freigabe.'],
 ['| Repository | Source ref | Source SHA |','| Repository | Quellreferenz | Quell-SHA |'],
 ['This page is **generated** from the Understand-Anything source export. Do not edit — changes will be overwritten. Editorial documentation is maintained separately and is never overwritten.', 'Diese Seite wird aus dem Understand-Anything-Export **generiert**. Nicht bearbeiten — Änderungen werden überschrieben. Redaktionelle Dokumentation wird getrennt gepflegt und niemals überschrieben.'],
 ['Generated platform tiers and cross-repo depends_on.', 'Generierte Plattformschichten und repositoryübergreifende depends_on-Beziehungen.'],
 ['Generated API endpoint inventory from the nightly graph.', 'Generiertes API-Endpunktinventar aus dem Quellgraphen.'],
 ['Generated repository table from the nightly graph.', 'Generierte Repository-Tabelle aus dem Quellgraphen.'],
 ['Generated backend service inventory from the nightly graph.', 'Generiertes Inventar der Backend-Dienste aus dem Quellgraphen.'],
 ['Nightly graph→docs→DPIA verification status.', 'Prüfstatus der Kette Graph→Dokumentation→DSFA.'],
 ['Generated high-level graph counts from the nightly export.', 'Generierte Gesamtzahlen des Graphen aus dem Quellexport.'],
 ['Generated graph summary for ', 'Generierte Graphzusammenfassung für '],
 ['Retired generated stub — see ', 'Archivierte generierte Verweisseite — siehe '],
 ['This page was a stale hand-maintained graph dump. It is **retired** in favour of the generated page:', 'Diese Seite war ein veralteter, manuell gepflegter Graphauszug. Sie ist **archiviert** und wird durch die generierte Seite ersetzt:'],
 ['DPIA chapter text is **not** auto-rewritten. Broken or drifted claims are flagged here and in ', 'DSFA-Kapitel werden **nicht** automatisch umgeschrieben. Defekte oder abweichende Aussagen werden hier und in '],
 [' for human review.', ' zur menschlichen Prüfung markiert.'],
 ['_(no meta.json commits — export used repo-node metadata)_', '_(keine Commits in meta.json — der Export verwendet die Repository-Knotenmetadaten)_'],
 ['_No endpoint nodes in this export._', '_Keine Endpunktknoten in diesem Export._'],
 ['_No endpoint nodes._', '_Keine Endpunktknoten._'],
 ['_None aggregated._', '_Keine Beziehungen aggregiert._'],
 ['Source evidence quotation (original language)', 'Zitat aus dem Quellnachweis (Originalsprache)'],
 ['Architecture tiers', 'Architekturschichten'], ['Endpoint inventory', 'Endpunktinventar'], ['Repository map', 'Repository-Übersicht'], ['Backend services', 'Backend-Dienste'], ['Truth chain status', 'Status der Nachweiskette'], ['Graph validation report', 'Graph-Prüfbericht'],
 ['Super graph index', 'Supergraph-Index'], ['Super graph explorer', 'Supergraph-Explorer'], ['Super graph detailed', 'Detaillierter Supergraph'], ['Understand-Anything inventory', 'Understand-Anything-Inventar'],
 ['Last export:', 'Letzter Export:'], ['Commit tips:', 'Commit-Stände:'], ['Live graphs:', 'Öffentliche Graphen:'],
 ['Cross-repo ', 'Repositoryübergreifend: '], [' (aggregated)', ' (aggregiert)'],
 ['| Tier | Repositories | Source |', '| Schicht | Repositories | Quelle |'], ['| From | To | Weight |', '| Von | Nach | Gewicht |'],
 ['| Method | Path / operation |', '| Methode | Pfad / Operation |'], ['| Repository | Tier | Commit | Nodes | Endpoints |', '| Repository | Schicht | Commit | Knoten | Endpunkte |'], ['| Field | Value |', '| Feld | Wert |'],
 ['Export generated at', 'Export erzeugt am'], ['Graph analyzed at', 'Graph analysiert am'], ['Repos in export', 'Repositories im Export'], ['Cross-repo depends_on pairs', 'Repositoryübergreifende depends_on-Paare'], ['Evidence claims checked', 'Geprüfte Nachweisaussagen'], ['Canary (expected broken)', 'Kontrollfall (erwartet defekt)'], ['Evidence verified at', 'Nachweise überprüft am'],
 ['## Depends on', '## Abhängigkeiten'], ['## Depended on by', '## Verwendet von'], ['- Depends on:', '- Abhängigkeiten:'], [' (weight ', ' (Gewicht '],
 ['| Tier |', '| Schicht |'], ['| Nodes |', '| Knoten |'], ['| Endpoints |', '| Endpunkte |'], ['## Endpoints', '## Endpunkte'], ['- Nodes:', '- Knoten:'], ['- Repos:', '- Repositories:'], ['- Generated at:', '- Erzeugt am:'], ['- Endpoints:', '- Endpunkte:'], ['- Edges:', '- Kanten:'],
 [' endpoints.', ' Endpunkte.'], [' (first 80 of ', ' (erste 80 von '], ['not run', 'nicht ausgeführt'],
];
export function localizeGeneratedPage(text, locale, quotations=[]) {
 if(locale==='en')return text;
 if(locale!=='de')throw Error('Unsupported generated locale');
 const saved=[];
 text=text.replace(/`[^`\n]*`/g,quote=>{const key=`QUOTATION_${saved.length}_END`;saved.push(quote);return key;});
 for(const quote of quotations) if(quote) text=text.replaceAll(quote,()=>{const key=`QUOTATION_${saved.length}_END`;saved.push(quote);return key;});
 // No code fences are currently emitted, but preserve them if templates add any.
 text=text.split(/(^```[\s\S]*?^```)/m).map(part=>part.startsWith('```')?part:terms.reduce((s,[from,to])=>s.replaceAll(from,to),part)).join('');
 saved.forEach((quote,i)=>{text=text.replaceAll(`QUOTATION_${i}_END`,quote);});
 return text;
}

/** Stable producer outcomes have a complete bilingual human explanation. */
const reasons = {
  'external-authority': {de: 'Die externe Referenz ist keine gewählte Repository-Quelle.', en: 'External authority is not a selected repository source.'},
  'source-reader-unavailable': {de: 'Das Repository oder der Leser für den gewählten unveränderlichen Quellstand ist nicht verfügbar.', en: 'Repository or selected immutable source reader is unavailable.'},
  'source-path-absent': {de: 'Der geprüfte Pfad fehlt im gewählten Quellstand.', en: 'Reviewed path is absent from the selected source revision.'},
  'source-bytes-unavailable': {de: 'Der Quellenleser hat keine unveränderlichen Dateibytes geliefert.', en: 'Selected source reader did not return immutable file bytes.'},
  'source-content-changed': {de: 'Der gewählte Quellinhalt weicht vom geprüften Hash ab; ein Abgleich ist erforderlich.', en: 'Selected source content differs from the reviewed content hash; reconciliation is required.'},
  'source-review-matches': {de: 'Geprüfter Inhalt und Revision stimmen mit dem gewählten Quellstand überein.', en: 'Reviewed content and revision match selected source.'},
  'source-content-unchanged': {de: 'Der Inhalt ist unverändert; die ursprüngliche Prüfrevision bleibt historische Provenienz.', en: 'Content is unchanged; original review revision remains historical provenance.'},
  'graph-target-unavailable': {de: 'Der zugeordnete Knoten fehlt, ist mehrdeutig oder hat den falschen Typ.', en: 'Mapped node is missing, ambiguous, or has the wrong type.'},
  'editorial-projection': {de: 'Die Zuordnung der Fachsprache ist redaktionell; die ursprünglichen Verhaltensbelege bleiben unverändert.', en: 'Vocabulary projection is editorial; original behavioral evidence is unchanged.'},
  'source-binding-absent': {de: 'Für diese Quelldatei ist keine geprüfte Bindung verfügbar.', en: 'No reviewed source-file binding is available.'},
  'repository-graph-absent': {de: 'Der Repository-Graph fehlt in der gewählten Generation.', en: 'Repository graph is absent from the selected generation.'}
};
export function reasonText(key) {
  const text = reasons[key];
  if (!text || ['de', 'en'].some(locale => typeof text[locale] !== 'string' || !text[locale].trim())) throw Error('Unknown glossary reason or missing translation: ' + key);
  return text;
}
export function reasonOutcome(reasonKey) { return {reasonKey, reason: reasonText(reasonKey).en}; }

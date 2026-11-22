// Reviewed milestone config (ORISO-Docs#209): groups Platform release names into milestones and fixes their order.
// Changes go through review like code. Releases the board has but this file lacks show up as "not assigned" in the panel.
export function validateMilestones(cfg) {
  const errors = [];
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return ['$: expected object'];
  if (cfg.schemaVersion !== 1) errors.push('$.schemaVersion: expected 1');
  if (!Array.isArray(cfg.milestones)) return errors.concat('$.milestones: expected array');
  const ids = new Set(), releases = new Set();
  cfg.milestones.forEach((m, i) => {
    const at = `$.milestones[${i}]`;
    if (!m || typeof m.id !== 'string' || !m.id) { errors.push(`${at}.id: expected non-empty string`); return; }
    if (ids.has(m.id)) errors.push(`${at}.id: "${m.id}" used twice`);
    ids.add(m.id);
    if (!m.title || typeof m.title.de !== 'string' || !m.title.de || typeof m.title.en !== 'string' || !m.title.en) errors.push(`${at}.title: needs de and en`);
    if (!Array.isArray(m.releases) || m.releases.some(r => typeof r !== 'string' || !r)) { errors.push(`${at}.releases: expected array of names`); return; }
    m.releases.forEach(r => { if (releases.has(r)) errors.push(`${at}.releases: "${r}" listed twice`); releases.add(r); });
  });
  return errors;
}

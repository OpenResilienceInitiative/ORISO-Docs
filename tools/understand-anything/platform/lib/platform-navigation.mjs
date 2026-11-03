// Source-derived presentation only. A tour is neither a semantic review nor runtime proof.
import { readFileSync } from 'node:fs';
import { assessClaim } from '../../lib/semantic-claims.mjs';
const userServiceEnrichment = JSON.parse(readFileSync(new URL('../../enrichments/enrich-userservice.json', import.meta.url), 'utf8'));
const detailRoutes = JSON.parse(readFileSync(new URL('../../hosted-viewer/viewer-routes.json', import.meta.url), 'utf8'));
const fullSHA = /^[a-f0-9]{40}$/i;
const groups = [
  { id: 'entry', repos: ['ORISO-Frontend', 'ORISO-Admin'], en: ['Entry points', 'Start with the two browser applications. Follow a selected source or contract into its owning repository; graph relations are not runtime verification.'], de: ['Einstiegspunkte', 'Beginne mit den beiden Browser-Anwendungen. Folge einer Quelle oder einem Vertrag in das zuständige Repository; Graph-Beziehungen sind kein Laufzeitnachweis.'] },
  { id: 'core', repos: ['ORISO-UserService', 'ORISO-AgencyService', 'ORISO-TenantService', 'ORISO-ConsultingTypeService'], en: ['Core domain', 'These repositories hold the backend contracts and domain code represented in this source vector. Open the repository graph for detail; no deployment is implied.'], de: ['Kerndomäne', 'Diese Repositories enthalten die Backend-Verträge und den Domänencode dieses Quellstands. Öffne den Repository-Graph für Details; dies belegt keine Bereitstellung.'] },
  { id: 'auth', repos: ['ORISO-UserService', 'ORISO-Keycloak'], en: ['Authentication and two factor', 'UserService is a client of the Keycloak OTP SPI. Follow the source-qualified two factor concepts and their implementation targets when present. Historical or unbound explanations still require review; this is not runtime verification.'], de: ['Authentifizierung und zweiter Faktor', 'UserService nutzt die OTP-SPI von Keycloak. Folge den quellengebundenen Konzepten und ihren Implementierungszielen, sofern vorhanden. Historische oder ungebundene Erklärungen brauchen weiterhin Prüfung; dies ist kein Laufzeitnachweis.'] },
  { id: 'messaging', repos: ['ORISO-Frontend', 'ORISO-UserService', 'ORISO-ElementCall', 'ORISO-Livekit'], en: ['Messaging boundary', 'Inspect the available Matrix-facing source and contract nodes. Repository presence does not prove communication between services. Connections beyond the extracted boundary are not runtime verified.'], de: ['Messaging-Grenze', 'Prüfe die verfügbaren Quellen und Verträge zur Matrix-Anbindung. Ein vorhandenes Repository belegt keine Kommunikation zwischen Diensten. Beziehungen jenseits der extrahierten Grenze sind nicht zur Laufzeit geprüft.'] },
  { id: 'operations', repos: ['ORISO-Helm', 'ORISO-Infra', 'ORISO-Docs'], en: ['Operations and decisions', 'Open deployment sources and architecture decisions. Discovery links do not establish accepted policy, and source revisions do not establish an active deployment.'], de: ['Betrieb und Entscheidungen', 'Öffne Bereitstellungsquellen und Architekturentscheidungen. Fundstellen belegen keine gültige Richtlinie, und Quellstände belegen keine aktive Bereitstellung.'] },
  { id: 'evidence', repos: ['ORISO-Docs', 'ORISO-E2E'], en: ['Evidence and coverage', 'Check the included and unavailable repositories and their exact source revisions below. Possible calls remain leads; absent calls are not proof that no caller exists. Semantic entries awaiting review are listed separately.'], de: ['Evidenz und Abdeckung', 'Prüfe unten die enthaltenen und nicht verfügbaren Repositories mit ihren exakten Quellständen. Mögliche Aufrufe sind Hinweise; fehlende Aufrufe belegen nicht, dass es keine Aufrufer gibt. Semantische Einträge ohne Prüfung werden separat aufgeführt.'] },
];

function repoOf(node) {
  return node.sourceRepo ?? node.metadata?.sourceRepo ?? node.id.match(/^(?:service:|repo:)(ORISO-[^:]+)$/)?.[1] ?? node.id.match(/^(ORISO-[^:]+)::/)?.[1];
}

export function decoratePlatform(graph, { expectedRepositories = Object.keys(graph.project?.sourceCommits ?? {}), repositoryGraphs = {} } = {}) {
  const vector = graph.project?.sourceCommits ?? {};
  const byId = new Map(graph.nodes.map(node => [node.id, node]));
  const repositories = [...new Set([...expectedRepositories, ...Object.keys(vector)])].map(repository => {
    const root = graph.nodes.find(node => ['service:' + repository, 'repo:' + repository].includes(node.id));
    const included = fullSHA.test(vector[repository] ?? '') && Boolean(root);
    if (root && repository === 'ORISO-Kubernetes') root.metadata = { ...root.metadata, lifecycle: 'retired' };
    return { repository, status: included ? 'included' : 'unavailable', ...(repository === 'ORISO-Kubernetes' ? { lifecycle: 'retired' } : {}), sourceCommit: fullSHA.test(vector[repository] ?? '') ? vector[repository] : null, nodeId: included ? root.id : null, detailHref: included ? detailRoutes[repository] ?? null : null };
  });
  const rootFor = repo => repositories.find(item => item.repository === repo)?.nodeId;
  const steps = groups.map((group, index) => {
    let candidates = group.repos.map(rootFor).filter(Boolean);
    if (group.id === 'auth') {
      const concepts = ['ORISO-UserService::concept:identity-authentication-2fa', 'ORISO-Keycloak::concept:otp-config-rest-api', 'ORISO-Keycloak::concept:email-otp-second-factor'].filter(id => byId.has(id));
      const targets = graph.edges.filter(edge => concepts.includes(edge.source) && edge.type === 'related').map(edge => edge.target).filter(id => byId.get(id)?.type === 'class');
      candidates = [...concepts, ...targets, ...candidates];
    }
    if (group.id === 'messaging') {
      const matrix = graph.nodes.filter(node => ['endpoint', 'function'].includes(node.type) && ['ORISO-Frontend', 'ORISO-UserService'].includes(repoOf(node)) && /matrix/i.test(`${node.name} ${node.filePath ?? ''} ${node.id}`)).map(node => node.id).sort();
      candidates = [...matrix.slice(0, 2), ...candidates];
    }
    const nodeIds = [...new Set(candidates)].slice(0, 6);
    const status = nodeIds.length ? 'available' : 'unavailable';
    const unavailable = { en: ' No source targets for this step are available in this generation.', de: ' Für diesen Schritt sind in dieser Generation keine Quellziele verfügbar.' };
    const locales = Object.fromEntries(['en', 'de'].map(locale => [locale, { title: group[locale][0], description: group[locale][1] + (status === 'unavailable' ? unavailable[locale] : '') }]));
    return { id: group.id, order: index + 1, title: locales.en.title, description: locales.en.description, nodeIds, status, locales };
  });
  graph.tour = steps.map(({ order, title, description, nodeIds }) => ({ order, title, description, nodeIds }));
  const semanticDispositions = [...userServiceEnrichment.concepts, ...userServiceEnrichment.flows].map(definition => {
    const repository = 'ORISO-UserService';
    const original = repositoryGraphs[repository]?.graph ?? repositoryGraphs[repository];
    const node = original?.nodes.find(item => item.id === definition.id);
    let disposition = { status: 'awaiting-review', reason: 'No reviewed source evidence available in this generation' };
    if (node?.metadata?.semanticClaim) {
      const assessment = assessClaim(node.metadata.semanticClaim, original);
      disposition = { status: assessment.status === 'unbound' ? 'awaiting-review' : assessment.status, reason: assessment.reason };
      if (original.project?.gitCommitHash !== vector[repository]) disposition = { status: 'stale', reason: 'Semantic source graph differs from the aggregate source vector' };
    }
    return { repository, nodeId: definition.id, name: definition.name, ...disposition, sourceCommit: vector[repository] ?? null, runtimeVerified: false };
  });
  graph.metadata = { ...graph.metadata, platformNavigation: { repositories, sourceCommits: { ...vector }, runtimeVerified: false }, platformTour: { steps, maxNodesPerStep: 6, runtimeVerified: false }, semanticDispositions };
  return graph;
}

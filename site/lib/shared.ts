export const appName = 'ORISO Dokumentation';
export const docsRoute = '/';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';

/** Path prefix the static export is served under (nginx `location /dokumentation/`). */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/dokumentation';

export const gitConfig = {
  user: 'OpenResilienceInitiative',
  repo: 'ORISO-Docs',
  branch: 'pre-dev',
};

/** Branch the Understand-Anything graph is built from — GitHub deep links point there. */
export const codeBranch = 'pre-dev';

/** Understand-Anything dashboards on the same origin: repo -> { slug, token }. */
export const uaDashboards: Record<string, { slug: string; token: string }> = {
  'ORISO-Frontend': { slug: 'frontend', token: 'oriso-frontend-dashboard' },
  'ORISO-Admin': { slug: 'admin-service', token: 'oriso-admin-dashboard' },
  'ORISO-UserService': { slug: 'user-service', token: 'oriso-userservice-dashboard' },
  'ORISO-AgencyService': { slug: 'agency-service', token: 'oriso-agency-dashboard' },
  'ORISO-ConsultingTypeService': { slug: 'consulting-type-service', token: 'oriso-consulting-type-dashboard' },
  'ORISO-TenantService': { slug: 'tenant-service', token: 'oriso-tenant-dashboard' },
  'ORISO-Keycloak': { slug: 'keycloak', token: 'oriso-keycloak-dashboard' },
  'ORISO-Helm': { slug: 'helm', token: 'oriso-helm-dashboard' },
  'ORISO-Docs': { slug: 'docs', token: 'oriso-docs-dashboard' },
  'ORISO-E2E': { slug: 'e2e', token: 'oriso-e2e-dashboard' },
  'ORISO-Infra': { slug: 'infra', token: 'oriso-infra-dashboard' },
};

/** Where the graph explorer lives when this site is NOT hosted next to it. */
export const uaOrigin = 'https://understand.oriso.org';

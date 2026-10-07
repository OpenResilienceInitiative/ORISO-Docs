// Isolated fixture of the actual pinned LearnPanel/store. Never public release evidence.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { decoratePlatform } from '../platform/lib/platform-navigation.mjs';

const option = key => { const i = process.argv.indexOf(key); if (i < 0 || !process.argv[i + 1]) throw Error(`${key} required`); return path.resolve(process.argv[i + 1]); };
const upstream = option('--upstream');
const playwrightModule = option('--playwright');
const output = option('--output');
fs.mkdirSync(output, { recursive: true });
const dashboard = path.join(upstream, 'understand-anything-plugin/packages/dashboard');
const require = createRequire(path.join(dashboard, 'package.json'));
const { createServer } = await import(pathToFileURL(require.resolve('vite')));
const { chromium } = await import(pathToFileURL(playwrightModule));
const sourceCommit = 'a'.repeat(40);
const repos = ['ORISO-Frontend', 'ORISO-Admin', 'ORISO-UserService', 'ORISO-AgencyService', 'ORISO-TenantService', 'ORISO-Keycloak', 'ORISO-Kubernetes', 'ORISO-ElementCall', 'ORISO-Livekit', 'ORISO-Helm', 'ORISO-Docs'];
const concept = 'ORISO-UserService::concept:identity-authentication-2fa';
const owning = 'ORISO-Keycloak::class:MailOtpVerifier.java:MailOtpVerifier';
const node = (id, type, name) => ({ id, type, name, summary: 'Synthetic navigation fixture, not runtime evidence.', tags: [], complexity: 'simple' });
const graph = decoratePlatform({
  version: '1.0.0', kind: 'oriso-platform',
  project: { name: 'ORISO-Platform fixture', description: 'Synthetic navigation fixture', languages: [], frameworks: [], analyzedAt: '2026-10-07T00:00:00Z', gitCommitHash: null, sourceCommits: Object.fromEntries(repos.map(repo => [repo, sourceCommit])) },
  nodes: [...repos.map(repo => node(`service:${repo}`, 'service', repo)), node(concept, 'concept', 'Two factor client'), node(owning, 'class', 'MailOtpVerifier')],
  edges: [{ type: 'related', source: concept, target: owning, direction: 'forward', weight: 1 }], layers: [], tour: [],
}, { expectedRepositories: [...repos, 'ORISO-Infra'] });
const fixtureName = `.oriso-platform-fixture-${process.pid}`;
const htmlPath = path.join(dashboard, `${fixtureName}.html`);
const entryPath = path.join(dashboard, `${fixtureName}.tsx`);
fs.writeFileSync(htmlPath, `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/${fixtureName}.tsx"></script></body></html>`);
fs.writeFileSync(entryPath, `import React,{useState} from 'react';import{createRoot}from'react-dom/client';import LearnPanel from './src/components/LearnPanel';import{I18nProvider}from'./src/contexts/I18nContext';import{useDashboardStore}from'./src/store';import './src/index.css';useDashboardStore.getState().setGraph(${JSON.stringify(graph)});function App(){const[language,setLanguage]=useState('en');const selected=useDashboardStore(s=>s.selectedNodeId);return <I18nProvider language={language}><div style={{height:'100vh',display:'flex',flexDirection:'column',minWidth:0}}><div><button onClick={()=>setLanguage('en')}>EN</button><button onClick={()=>setLanguage('de')}>DE</button><output data-testid="selected" style={{display:'block',overflowWrap:'anywhere'}}>{selected}</output></div><div style={{minHeight:0,flex:1}}><LearnPanel/></div></div></I18nProvider>}createRoot(document.getElementById('root')!).render(<App/>);`);
let server, browser;
const evidence = [];
try {
  server = await createServer({ root: dashboard, server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const port = server.httpServer.address().port;
  browser = await chromium.launch({ headless: true });
  for (const width of [320, 412, 1280]) for (const language of ['en', 'de']) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    try {
      await page.goto(`http://127.0.0.1:${port}/${fixtureName}.html`);
      await page.getByRole('button', { name: language === 'de' ? 'DE' : 'EN', exact: true }).click();
      const start = page.getByRole('button', { name: language === 'de' ? 'Tour starten' : 'Start Tour', exact: true });
      await start.focus(); await page.keyboard.press('Enter');
      const titles = [];
      for (let i = 0; i < 6; i++) {
        const title = graph.metadata.platformTour.steps[i].locales[language].title;
        await page.getByRole('heading', { name: title, exact: true }).waitFor(); titles.push(title);
        if (i === 2) {
          const target = page.getByRole('button', { name: 'MailOtpVerifier', exact: true });
          await target.focus(); await page.keyboard.press('Enter');
          assert.equal(await page.getByTestId('selected').textContent(), owning);
          if (width === 320 && language === 'de') await page.screenshot({ path: path.join(output, 'auth-320-de.png'), fullPage: true });
        }
        if (i < 5) {
          const next = page.getByRole('button', { name: language === 'de' ? 'Weiter' : 'Next', exact: true });
          await next.focus(); await page.keyboard.press('Enter');
        }
      }
      const coverage = page.getByRole('region', { name: language === 'de' ? 'Repository-Abdeckung' : 'Repository coverage', exact: true });
      assert.ok(await coverage.getByText(language === 'de' ? 'Nicht verfügbar' : 'Unavailable', { exact: true }).isVisible());
      assert.ok(await coverage.getByText(language === 'de' ? 'Historische Quelle (stillgelegt)' : 'Historical source (retired)', { exact: true }).isVisible());
      const userLink = coverage.getByRole('listitem').filter({ hasText: 'ORISO-UserService' }).getByRole('link');
      assert.equal(await userLink.getAttribute('href'), '/user-service/');
      await coverage.locator('summary').click();
      assert.equal(await coverage.locator('details li').count(), 27);
      assert.ok(await coverage.getByText('ORISO-UserService::concept:case-handover', { exact: true }).isVisible());
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${width}px ${language}: horizontal overflow`);
      const finish = page.getByRole('button', { name: language === 'de' ? 'Abschließen' : 'Finish', exact: true });
      await finish.focus(); await page.keyboard.press('Enter');
      await start.waitFor();
      evidence.push({ width, language, titles, keyboardSelection: owning, detailHref: '/user-service/', semanticEntries: 27, horizontalOverflow: false });
    } finally { await page.close(); }
  }
  fs.writeFileSync(path.join(output, 'browser-receipt.json'), JSON.stringify({ fixture: true, publicAcceptance: false, evidence }, null, 2) + '\n');
  console.log('Actual pinned platform tour: all six steps, owning-class keyboard selection, DE/EN, repository detail route, 27 review dispositions; 320/412/1280px without horizontal overflow.');
} finally {
  if (browser) await browser.close();
  if (server) await server.close();
  fs.rmSync(htmlPath, { force: true }); fs.rmSync(entryPath, { force: true });
}

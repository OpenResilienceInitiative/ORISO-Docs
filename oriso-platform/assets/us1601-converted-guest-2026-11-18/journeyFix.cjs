// US#1601 fix verification: guest journey on Dev with the local bundle of
// Frontend PRs #2335 + #2336 served to the guest and the fresh sign-in.
const H = require('../common.cjs');
const crypto = require('crypto');
const path = require('path');
const BUNDLE = process.env.BUNDLE;
const OUT = process.env.OUTDIR;
const shot = async (page, name, mask = []) => { await page.screenshot({ path: `${OUT}/${name}.png`, mask }); H.log('shot', name); };
const fsx = H.fs;
const TYPES = { '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.map': 'application/json', '.html': 'text/html', '.ico': 'image/x-icon', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm' };
async function useBundle(ctx) {
  const entry = fsx.readFileSync(path.join(BUNDLE, 'beratung-hilfe.html'));
  await ctx.route(`${H.BASE}/**`, async (route) => {
    const req = route.request(); const u = new URL(req.url());
    if (/^\/(service|auth|_matrix|_synapse|config\.js|api|matrix)/.test(u.pathname)) return route.continue();
    if (u.pathname.startsWith('/static/')) {
      const f = path.join(BUNDLE, u.pathname);
      if (fsx.existsSync(f)) return route.fulfill({ status: 200, body: fsx.readFileSync(f), headers: { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' } });
      return route.continue();
    }
    if (req.resourceType() === 'document') return route.fulfill({ status: 200, body: entry, headers: { 'content-type': 'text/html' } });
    return route.continue();
  });
}
(async () => {
  const net = []; const res = {};
  const ss = H.ssFrom(process.argv[2]); const ctok = H.kcToken(ss);
  const AV = `${H.BASE}/service/conversations/consultants/availability`;
  const b = await H.chromium.launch({ headless: true });
  let cons;
  try {
    const cctx = await b.newContext({ storageState: ss, viewport: { width: 1440, height: 900 } });
    await cctx.addInitScript(() => { Object.keys(localStorage).filter(k => k.startsWith('matrix')).forEach(k => localStorage.removeItem(k)); localStorage.setItem('caritas_liveChatAvailability', '1'); });
    cons = await cctx.newPage(); H.netLog(cons, net, 'C');
    await cons.goto(H.BASE, { waitUntil: 'domcontentloaded' }); await cons.waitForLoadState('networkidle').catch(() => {}); await cons.waitForTimeout(3000);
    const put = await H.api(cons, AV, ctok, 'PUT', { available: true });
    res.A1 = { put: put.status }; H.log('A1 availability PUT', put.status);
    await cons.reload({ waitUntil: 'domcontentloaded' }); await cons.waitForTimeout(5000);

    // A2 guest (local bundle)
    const gctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'de-DE' });
    await useBundle(gctx);
    const guest = await gctx.newPage(); H.netLog(guest, net, 'G');
    guest.on('response', r => { if (/\/_matrix\//.test(r.url()) && r.status() >= 400) net.push({ tag: 'G', m: r.request().method(), url: r.url().replace(H.BASE, '').replace(/\?.*$/, '').replace(/![^/]+/, '!room').replace(/@[^/]+/, '@user'), s: r.status() }); });
    const displayNames = [];
    for (const p of [guest]) p.on('request', r => { if (r.method() === 'PUT' && /sessions\/\d+\/data/.test(r.url())) { try { displayNames.push(['G', r.postDataJSON().displayName]); } catch {} } });
    await guest.goto(`${H.BASE}/invite/${H.TOKEN}`, { waitUntil: 'domcontentloaded' });
    let waiting = false;
    for (let i = 0; i < 40 && !waiting; i++) {
      await guest.waitForTimeout(2000);
      const btns = await H.buttons(guest);
      if (btns.some(t => /Zum Warteraum/i.test(t))) { await guest.getByRole('button', { name: /Zum Warteraum/i }).last().click(); await guest.waitForTimeout(3000); }
      waiting = await guest.getByText(/Warteraum|Gleich geht es los|Sie sind die Nächste|vor Ihnen/).first().isVisible().catch(() => false) && net.some(e => /redeem/.test(e.url));
    }
    const redeem = net.find(e => /redeem/.test(e.url));
    if (!waiting || !redeem || !redeem.b || !redeem.b.sessionId) throw new Error('A2 failed: no waiting room / redeem');
    const sessionId = redeem.b.sessionId; res.A2 = { sessionId, displayName: displayNames[0] && displayNames[0][1] };
    H.log('A2 redeem', JSON.stringify(res.A2));
    const footer = await guest.evaluate(() => (document.body.innerText.match(/v\d+\.\d+\.\d+[^\n]*/) || [''])[0]);
    H.log('A2 bundle footer', footer);

    // A3 accept + one message each way
    const qUrl = `${H.BASE}/service/conversations/consultants/enquiries/anonymous?offset=0&count=50&filter=all`;
    let seen = false;
    for (let i = 0; i < 30 && !seen; i++) { const q = await H.api(cons, qUrl, ctok); seen = ((q.body && q.body.sessions) || []).some(s => s.session && s.session.id === sessionId); if (!seen) await cons.waitForTimeout(2000); }
    if (!seen) throw new Error('A3: guest session not in consultant queue');
    const acc = await H.api(cons, `${H.BASE}/service/conversations/askers/anonymous/${sessionId}/accept`, ctok, 'PUT');
    H.log('A3 accept', acc.status); if (acc.status >= 300) throw new Error('A3 accept failed');
    let started = false;
    for (let i = 0; i < 30 && !started; i++) {
      await guest.waitForTimeout(2000);
      if (await guest.getByText(/Sie sind dran/).first().isVisible().catch(() => false)) {
        const boxes = guest.locator('input[type=checkbox]');
        for (let k = 0; k < await boxes.count(); k++) { const bx = boxes.nth(k); if (await bx.isVisible().catch(() => false) && !(await bx.isChecked())) await bx.check({ force: true }).catch(() => {}); }
        await guest.getByRole('button', { name: /Gespräch beginnen/ }).last().click(); started = true;
      }
    }
    await guest.waitForTimeout(8000);
    for (const sel of ['#overlay button', '.anonymousConsentGate__btnAccept', 'button:has-text("Weiter mit Auswahl")', 'button:has-text("Jetzt Chat starten")']) { await H.clickIf(guest, sel, 4000); await guest.waitForTimeout(1000); }
    await cons.goto(`${H.BASE}/sessions/consultant/sessionView/session/${sessionId}`, { waitUntil: 'domcontentloaded' }); await cons.waitForTimeout(6000);
    const composer = cons.locator('button.sendButton'); await composer.waitFor({ state: 'visible', timeout: 45000 });
    const RUN = Date.now().toString(36);
    const cText = `US1601 fix counsellor ${RUN}`, gText = `US1601 fix guest ${RUN}`;
    await cons.locator('.ProseMirror, [contenteditable="true"]').first().click(); await cons.keyboard.type(cText); await composer.click(); await cons.waitForTimeout(4000);
    await H.clickIf(guest, 'button:has-text("Jetzt Chat starten")', 3000);
    await guest.getByText(cText).first().waitFor({ state: 'visible', timeout: 60000 });
    await guest.locator('.ProseMirror, [contenteditable="true"]').first().click(); await guest.keyboard.type(gText); await guest.locator('button.sendButton').click(); await guest.waitForTimeout(3000);
    await cons.getByText(gText).first().waitFor({ state: 'visible', timeout: 60000 });
    await shot(guest, 'F1-guest-chat-both-messages');
    H.log('A3 both messages delivered'); res.A3 = 'ok';
    const guestSessionPath = new URL(guest.url()).pathname;
    const namesBeforeConversion = displayNames.length;

    // A4 conversion — NO settle wait: the first click must work (FE#2334)
    await guest.goto(`${H.BASE}/live-chat/convert`, { waitUntil: 'domcontentloaded' });
    const pw = guest.locator('input[type=password]');
    await pw.first().waitFor({ state: 'visible', timeout: 60000 });
    const prepareButton = await guest.getByRole('button', { name: /Wiederherstellungsschlüssel vorbereiten/ }).count();
    const keyShown = await guest.locator('[data-cy="recovery-key-display"]').count();
    H.log('A4 password form shown directly; prepare buttons:', prepareButton, 'key displays:', keyShown);
    const loginName = (await guest.locator('strong').first().innerText()).trim();
    const password = crypto.randomBytes(18).toString('base64url') + 'Aa1!';
    await pw.nth(0).fill(password); await pw.nth(1).fill(password);
    const labelOverlap = await guest.evaluate(() => [...document.querySelectorAll('input[type=password]')].map(i => { const l = i.closest('.MuiFormControl-root')?.querySelector('label'); if (!l) return 'no-label'; const a = l.getBoundingClientRect(), b = i.getBoundingClientRect(); const cs = getComputedStyle(i); const textTop = b.top + parseFloat(cs.paddingTop); const textBottom = b.bottom - parseFloat(cs.paddingBottom); return { verdict: (a.bottom > textTop + 1 && a.top < textBottom - 1) ? 'overlap' : 'clear', labelBottom: Math.round(a.bottom), textTop: Math.round(textTop), transform: getComputedStyle(l).transform, shrink: l.classList.contains('MuiInputLabel-shrink') }; }));
    H.log('A4 label vs. input box (right after typing):', JSON.stringify(labelOverlap));
    await guest.waitForTimeout(1500);
    const measure = () => guest.evaluate(() => [...document.querySelectorAll('input[type=password]')].map(i => { const l = i.closest('.MuiFormControl-root')?.querySelector('label'); const a = l.getBoundingClientRect(), b = i.getBoundingClientRect(); const cs = getComputedStyle(i); const textTop = b.top + parseFloat(cs.paddingTop); const textBottom = b.bottom - parseFloat(cs.paddingBottom); return { verdict: (a.bottom > textTop + 1 && a.top < textBottom - 1) ? 'overlap' : 'clear', labelBottom: Math.round(a.bottom), textTop: Math.round(textTop), transform: getComputedStyle(l).transform }; }));
    res.labelSettled = await measure();
    H.log('A4 label vs. input box (after 1.5 s):', JSON.stringify(res.labelSettled));
    await shot(guest, 'F2-conversion-form-password-only');
    await guest.locator('input[type=password]').nth(1).focus(); await guest.waitForTimeout(400);
    await shot(guest, 'F2b-conversion-form-focused');
    const t0 = Date.now();
    await guest.getByRole('button', { name: /Mein Konto erstellen/ }).click();
    const ok = await guest.getByText(/Ihr Konto ist bereit/).first().waitFor({ state: 'visible', timeout: 90000 }).then(() => true).catch(() => false);
    const fallback = await guest.locator('[data-cy="recovery-key-display"]').count();
    const errs = JSON.stringify(await guest.locator('[role=alert]').allInnerTexts().catch(() => []));
    res.A4 = { ok, seconds: Math.round((Date.now() - t0) / 1000), fallbackKeyShown: fallback > 0, prepareButton, keyShown, labelOverlap, alerts: errs, post: net.filter(e => /conversion/.test(e.url) && e.m === 'POST').map(e => e.s) };
    H.log('A4 result', JSON.stringify(res.A4));
    await shot(guest, ok ? 'F3-conversion-ready' : 'F3-FAIL-conversion');
    if (!ok) throw new Error('A4 conversion failed');

    // A5 sign out from the chat view
    await guest.goto(`${H.BASE}${guestSessionPath}`, { waitUntil: 'domcontentloaded' }); await guest.waitForTimeout(5000);
    const netBeforeLogout = net.length;
    const lo = guest.locator('.navigation__item--nav-logout, [class*="logout"]').filter({ visible: true }).first();
    let loggedOut = false;
    if (await lo.isVisible().catch(() => false)) { await lo.click(); loggedOut = true; } else { const t = guest.getByText('Abmelden', { exact: true }).first(); if (await t.isVisible().catch(() => false)) { await t.click(); loggedOut = true; } }
    await guest.waitForTimeout(6000);
    const logoutCalls = net.slice(netBeforeLogout).filter(e => e.tag === 'G' && e.m !== 'GET').map(e => `${e.m} ${e.url} ${e.s}`);
    res.A5logout = { loggedOut, url: new URL(guest.url()).pathname, finishCalled: logoutCalls.some(c => /anonymous\/\d+\/finish/.test(c)), availabilityCalled: logoutCalls.some(c => /consultants\/availability/.test(c)), calls: logoutCalls };
    H.log('A5 sign-out', JSON.stringify(res.A5logout));
    await shot(guest, 'F4-after-sign-out');
    await gctx.close();

    // A5 fresh sign-in in a new browser context (local bundle)
    const fctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'de-DE' });
    await useBundle(fctx);
    const fresh = await fctx.newPage(); H.netLog(fresh, net, 'F');
    fresh.on('request', r => { if (r.method() === 'PUT' && /sessions\/\d+\/data/.test(r.url())) { try { displayNames.push(['F', r.postDataJSON().displayName]); } catch {} } });
    await fresh.goto(`${H.BASE}/login`, { waitUntil: 'domcontentloaded' });
    await fresh.locator('#username').waitFor({ state: 'visible', timeout: 30000 });
    await fresh.locator('#username').fill(loginName); await fresh.locator('#passwordInput').fill(password);
    await fresh.locator('.loginForm__actions button, .loginForm button[type="submit"]').first().click();
    await fresh.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 60000 }).catch(() => {});
    await fresh.waitForTimeout(10000);
    const recoveryDialog = await fresh.locator('[data-cy="key-backup-recovery-dialog"]').isVisible().catch(() => false);
    const recoveryOpen = await fresh.locator('[data-testid="key-backup-recovery-open"], [data-cy="key-backup-recovery-open"]').first().isVisible().catch(() => false);
    const snack = async () => (await fresh.locator('[role=status]').allInnerTexts().catch(() => [])).map(t => t.replace(/\s+/g, ' ').slice(0, 160)).filter(Boolean);
    if (!/session\//.test(fresh.url())) { await fresh.goto(`${H.BASE}${guestSessionPath}`, { waitUntil: 'domcontentloaded' }); await fresh.waitForTimeout(8000); }
    const tl = (t) => fresh.locator('[class*="messageItem"]', { hasText: t }).first();
    const gate = async () => ({ weiter: await fresh.locator('button:has-text("Weiter mit Auswahl")').count(), start: await fresh.locator('button:has-text("Jetzt Chat starten")').count() });
    const seeC = await tl(cText).waitFor({ state: 'visible', timeout: 45000 }).then(() => true).catch(() => false);
    const seeG = await tl(gText).isVisible().catch(() => false);
    res.A5signin = { url: new URL(fresh.url()).pathname, recoveryDialog, recoveryOpen, gate: await gate(), seeC, seeG, undecryptable: await fresh.getByText(/Unable to decrypt|konnte nicht entschlüsselt/i).count(), snackbar: await snack(), newDisplayNames: displayNames.slice(namesBeforeConversion) };
    H.log('A5 fresh sign-in', JSON.stringify(res.A5signin));
    await shot(fresh, 'F5-fresh-sign-in-history-visible');

    // A7 the counsellor finishes the chat; the converted account still sees its history
    // The converted person ends the chat themselves (explicit "Chat beenden" path, same API).
    const fin = await fresh.evaluate(async (url) => { const tok = decodeURIComponent((document.cookie.split('; ').find(c => c.startsWith('keycloak=')) || '').slice(9)); const csrf = document.cookie.split('; ').find(c => c.startsWith('CSRF-TOKEN='))?.split('=')[1]; const r = await fetch(url, { method: 'PUT', credentials: 'include', headers: { ...(tok ? { Authorization: `Bearer ${tok}` } : {}), ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}) } }); return { status: r.status }; }, `${H.BASE}/service/conversations/anonymous/${sessionId}/finish`);
    H.log('A7 converted account finished its own chat', fin.status);
    await fresh.waitForTimeout(4000);
    await fresh.reload({ waitUntil: 'domcontentloaded' }); await fresh.waitForTimeout(10000);
    const seeC2 = await tl(cText).waitFor({ state: 'visible', timeout: 45000 }).then(() => true).catch(() => false);
    const seeG2 = await tl(gText).isVisible().catch(() => false);
    await fresh.waitForTimeout(15000); await fresh.reload({ waitUntil: 'domcontentloaded' }); await fresh.waitForTimeout(12000);
    const seeC3 = await tl(cText).waitFor({ state: 'visible', timeout: 45000 }).then(() => true).catch(() => false);
    const sessionStatus = await fresh.evaluate(async (id) => { const tok = decodeURIComponent((document.cookie.split('; ').find(c => c.startsWith('keycloak=')) || '').slice(9)); const r = await fetch('/service/users/sessions/room?rcGroupIds=&sessionIds=' + id, { headers: { Authorization: 'Bearer ' + tok } }).catch(() => null); if (!r || !r.ok) return { s: r && r.status }; const j = await r.json(); return { s: r.status, status: j?.sessions?.[0]?.session?.status }; }, sessionId);
    res.A7 = { finish: fin.status, seeC: seeC2, seeG: seeG2, seeCAfter30s: seeC3, sessionStatus, gate: await gate(), mailButton: await fresh.getByRole('button', { name: /Mail-Beratung starten|Mail Beratung starten/ }).count(), composer: await fresh.locator('.session__submit-interface').count(), closedNote: await fresh.getByText(/Live-Chat wurde beendet/).count() };
    H.log('A7 finished chat after reload', JSON.stringify(res.A7));
    await shot(fresh, 'F6-finished-chat-history-visible');
    await fctx.close();
  } catch (e) {
    H.log('FAILED:', H.scrub(e.message));
    for (const c of b.contexts()) for (const pg of c.pages()) { try { H.log('page', new URL(pg.url()).pathname.replace(H.TOKEN, '<tok>'), JSON.stringify(await H.heads(pg)), JSON.stringify((await H.buttons(pg)).slice(-8))); await pg.screenshot({ path: `${OUT}/FAIL-${Date.now()}.png` }); } catch {} }
  } finally {
    if (cons) { const off = await H.api(cons, AV, ctok, 'PUT', { available: false }).catch(() => ({ status: 'err' })); H.log('cleanup availability false', off.status); }
    H.log('RESULT', JSON.stringify(res));
    H.log('NET (non-GET, >=400)', JSON.stringify(net.filter(e => e.m !== 'GET' || e.s >= 400).map(e => `${e.tag} ${e.m} ${e.url.replace(/![^/]+/, '!room')} ${e.s}`)));
    await b.close();
  }
})().catch(e => { console.error('ERR', H.scrub(e.message)); process.exit(1); });

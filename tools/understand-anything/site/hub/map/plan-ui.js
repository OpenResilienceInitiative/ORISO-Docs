/* Planning moves for the capability map (ORISO-Docs#210, #211).
   Classic script (no module syntax) so the page and node --test load the same file. No DOM access here.
   The static hub has no backend: a move is a planning INTENT. It is shown at once (optimistic), then handed to
   window.PlanningTransport when the page has one, and rolled back with a reason when the write fails.
   Without a transport the intent stays visible as "not saved" together with the exact tools/planning-map/plan.mjs
   command that an operator runs. Transport contract (same shape as lib/planning-api.mjs results):
     PlanningTransport.assignRelease(intent) -> Promise<{ok:true} | {ok:false, error:{code,message,issue?}, applied?:["Org/Repo#1"]}>
     PlanningTransport.setGate(intent)       -> same
   intent = {action:'assignRelease'|'setGate', issues:[{repository, number}], release|gate, withSubIssues?, expect?} */
(function (root, factory) {
  root.PlanMove = factory();
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  var ORG = 'OpenResilienceInitiative';
  var RUNNER = 'node tools/planning-map/plan.mjs';
  var COMMAND_OF = {assignRelease: 'assign-release', setGate: 'set-gate'};
  /* Reasons shown to the user, [de, en]. The raw GitHub message is appended by the page. */
  var REASONS = {
    NO_WRITE_RIGHTS: ['Keine Schreibrechte auf GitHub für diese Aufgabe.', 'No write rights on GitHub for this issue.'],
    CONFLICT: ['Auf GitHub steht inzwischen etwas anderes: Karte neu synchronisieren und noch einmal versuchen.', 'GitHub has changed in the meantime: sync the map and try again.'],
    NOT_FOUND: ['Aufgabe oder Feld auf GitHub nicht gefunden.', 'Issue or field not found on GitHub.'],
    UNKNOWN_RELEASE: ['Dieses Release gibt es auf GitHub nicht.', 'GitHub does not know this release.'],
    UNKNOWN_GATE: ['Diesen Gate-Wert gibt es auf GitHub nicht.', 'GitHub does not know this gate value.'],
    FIELD_MISSING: ['Das Feld fehlt noch auf GitHub (Projekt-Admin muss es anlegen).', 'The field does not exist on GitHub yet (a project admin has to create it).'],
    NOT_ON_BOARD: ['Die Aufgabe steht nicht auf dem Board ORISO Roadmap.', 'The issue is not on the ORISO Roadmap board.'],
    TRANSPORT: ['Der Schreibdienst war nicht erreichbar.', 'The write service could not be reached.'],
    GITHUB_ERROR: ['GitHub hat die Änderung abgelehnt.', 'GitHub rejected the change.']
  };
  var FALLBACK = ['Die Änderung konnte nicht gespeichert werden.', 'The change could not be saved.'];

  function repoName(full) { var i = String(full || '').lastIndexOf('/'); return i < 0 ? String(full || '') : full.slice(i + 1); }
  function key(repo, n) { return repoName(repo) + '#' + n; }
  function fullName(repo, org) { return String(repo).indexOf('/') < 0 ? (org || ORG) + '/' + repo : repo; }
  function refText(i, org) { return fullName(i.repository, org) + '#' + i.number; }

  function reason(error, lang) {
    var r = (error && REASONS[error.code]) || FALLBACK;
    return r[lang === 'en' ? 1 : 0];
  }

  function quote(a) { return /^[\w.\/:@%+=,-]+$/.test(a) ? a : "'" + String(a).replace(/'/g, "'\\''") + "'"; }
  /* Arguments after "node tools/planning-map/plan.mjs". withApply adds --apply. */
  function argv(intent, withApply, org) {
    var a = [COMMAND_OF[intent.action]];
    intent.issues.forEach(function (i) { a.push('--issue', refText(i, org)); });
    if (intent.action === 'assignRelease') {
      a.push('--release', intent.release);
      if (intent.withSubIssues) a.push('--with-sub-issues');
      if (intent.expect !== undefined) a.push('--expect', intent.expect === null ? 'none' : intent.expect);
    } else a.push('--gate', intent.gate);
    if (withApply) a.push('--apply');
    return a;
  }
  function command(intent, withApply, org) { return RUNNER + ' ' + argv(intent, withApply, org).map(quote).join(' '); }

  /* Board items an intent touches: the issue itself, plus (assignRelease with sub-issues) its sub-issues that are on the board. */
  function targets(board, epics, intent) {
    var repos = (epics && epics.repos) || [], list = (epics && epics.epics) || [], want = {}, items = (board && board.items) || [];
    var onBoard = {};
    items.forEach(function (it) { if (it.contentType === 'Issue' && it.repository && typeof it.number === 'number') onBoard[key(it.repository, it.number)] = it; });
    intent.issues.forEach(function (i) {
      var k = key(i.repository, i.number);
      if (onBoard[k]) want[k] = onBoard[k];
      if (!intent.withSubIssues) return;
      Object.keys(onBoard).forEach(function (sk) {
        var it = onBoard[sk];
        if (it.parent && key(it.parent.repository, it.parent.number) === k) want[sk] = it;
      });
      list.forEach(function (e) {
        if (key(repos[e.r], e.n) !== k) return;
        (e.subs || []).forEach(function (s) { var sk = key(repos[s[0]], s[1]); if (onBoard[sk]) want[sk] = onBoard[sk]; });
      });
    });
    return want;
  }

  function create() {
    var seq = 0, intents = [], listeners = [];
    function changed() { listeners.forEach(function (f) { f(); }); }
    function find(id) { for (var n = 0; n < intents.length; n++) if (intents[n].id === id) return intents[n]; return null; }
    var store = {
      intents: intents,
      onChange: function (f) { listeners.push(f); },
      active: function () { return intents.filter(function (x) { return x.status !== 'failed' && x.status !== 'discarded'; }); },
      /* Board with every live intent applied. Failed and discarded intents are gone: that is the rollback. */
      view: function (board, epics) {
        if (!board) return board;
        var live = store.active();
        if (!live.length) return board;
        var items = board.items.map(function (it) { return it; });
        var pos = {};
        items.forEach(function (it, n) { if (it.contentType === 'Issue' && it.repository) pos[key(it.repository, it.number)] = n; });
        live.forEach(function (x) {
          var hit = targets(board, epics, x);
          Object.keys(hit).forEach(function (k) {
            if (x.only && x.only.indexOf(fullName(hit[k].repository) + '#' + hit[k].number) < 0) return;
            var copy = {}; Object.keys(items[pos[k]]).forEach(function (f) { copy[f] = items[pos[k]][f]; });
            if (x.action === 'assignRelease') copy.platformRelease = x.release; else if (x.action === 'setGate') copy.gate = x.gate;
            items[pos[k]] = copy;
          });
        });
        var out = {}; Object.keys(board).forEach(function (f) { out[f] = board[f]; });
        out.items = items;
        return out;
      },
      discard: function (id) { var x = find(id); if (x) { x.status = 'discarded'; changed(); } },
      /* Hide a finished entry from the log without undoing it. */
      dismiss: function (id) { var x = find(id); if (x) { x.dismissed = true; changed(); } },
      /* Optimistic: the intent is live before the write returns. Resolves with the final state of the intent. */
      run: function (intent, transport) {
        var x = {id: ++seq, action: intent.action, issues: intent.issues, release: intent.release, gate: intent.gate,
          withSubIssues: !!intent.withSubIssues, expect: intent.expect, label: intent.label || '', status: 'pending', error: null};
        if (x.expect === undefined) delete x.expect;
        intents.push(x); changed();
        var fn = transport && typeof transport[intent.action] === 'function' ? transport[intent.action] : null;
        if (!fn) { x.status = 'command'; changed(); return Promise.resolve(x); }
        var call;
        try { call = Promise.resolve(fn.call(transport, JSON.parse(JSON.stringify(intent)))); } catch (e) { call = Promise.reject(e); }
        return call.then(function (res) { return res; }, function (e) { return {ok: false, error: {code: 'TRANSPORT', message: String(e && e.message || e)}}; })
          .then(function (res) {
            if (res && res.ok) { x.status = 'confirmed'; }
            else {
              x.error = (res && res.error) || {code: 'GITHUB_ERROR', message: ''};
              if (res && res.applied && res.applied.length) { x.status = 'confirmed'; x.only = res.applied.slice(); x.partial = true; } /* what GitHub already took stays */
              else x.status = 'failed';
            }
            changed(); return x;
          });
      }
    };
    return store;
  }
  return {REASONS: REASONS, reason: reason, argv: argv, command: command, targets: targets, create: create, key: key, fullName: fullName};
});

/* Board aggregation for the capability map (ORISO-Docs#205).
   Classic script (no module syntax) so the page and node --test load the same file.
   Input: board.json (tools/planning-map/board.schema.json) and the epics data of the map
   (epics.repos[], epics.epics[] with r, n, b and subs [[repoIdx, number, title, state]]).
   The epic -> capability mapping is the one already in the map data; file rules of #198 are not used here. */
(function (root, factory) {
  root.BoardAgg = factory();
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  /* Board order of the Status field; group names pick the token ramp. */
  var STATUSES = ['Backlog', 'Ready', 'On hold', 'In progress', 'In review', 'QA internal', 'QA external', 'Done'];
  var GROUP = {'Backlog': 'neutral', 'Ready': 'neutral', 'On hold': 'neutral', 'In progress': 'progress', 'In review': 'progress', 'QA internal': 'qa-internal', 'QA external': 'qa-external', 'Done': 'done'};
  var TOKEN = {'Backlog': 'status-backlog', 'Ready': 'status-ready', 'On hold': 'status-on-hold', 'In progress': 'status-in-progress', 'In review': 'status-in-review', 'QA internal': 'status-qa-internal', 'QA external': 'status-qa-external', 'Done': 'status-done'};

  /* Gate field (ORISO-Docs#211): eight steps, same list as tools/planning-map/gate-options.json (a test compares them).
     The field is a project field; board.json items carry `gate` (null until a project admin creates it). */
  var GATES = [
    {name: "P1 Framed", phase: "plan", step: 1, criteria: {de: "Das Problem und das gewünschte Ergebnis stehen im Issue; Epic und Fähigkeit sind bekannt.", en: "Problem and desired outcome are written in the issue; epic and capability are known."}},
    {name: "P2 Specified", phase: "plan", step: 2, criteria: {de: "Abnahmekriterien und Testplan sind geschrieben; offene Fragen sind beantwortet.", en: "Acceptance criteria and test plan are written; open questions are answered."}},
    {name: "P3 Sliced", phase: "plan", step: 3, criteria: {de: "In Teile geschnitten, die ein Agent in einem Pull Request schafft; Aufwand ist gesetzt.", en: "Cut into slices an agent can finish in one pull request; effort is set."}},
    {name: "P4 Ready for agent", phase: "plan", step: 4, criteria: {de: "P1 bis P3 erfüllt, Priorität, Readiness und Release gesetzt, kein offener Blocker; Status ist Ready.", en: "P1 to P3 met, priority, readiness and release set, no open blocker; status is Ready."}},
    {name: "R1 Checks green", phase: "review", step: 5, criteria: {de: "Pull Request ist offen und alle Prüfungen (Build, Tests, Lint) sind grün.", en: "Pull request is open and all checks (build, tests, lint) are green."}},
    {name: "R2 AI review", phase: "review", step: 6, criteria: {de: "Die KI-Prüfung ist durch; Befunde sind behoben oder beantwortet.", en: "The AI review passed; findings are fixed or answered."}},
    {name: "R3 Human review", phase: "review", step: 7, criteria: {de: "Ein Mensch hat den Code geprüft und den Pull Request freigegeben.", en: "A human reviewed the code and approved the pull request."}},
    {name: "R4 Verified on Dev", phase: "review", step: 8, criteria: {de: "Gemergt und auf Dev geprüft; Status ist QA internal. Danach gilt der bestehende Ablauf (QA external, Done).", en: "Merged and checked on Dev; status is QA internal. After that the existing lifecycle applies (QA external, Done)."}}
  ];
  function gateStep(name) { for (var n = 0; n < GATES.length; n++) if (GATES[n].name === name) return GATES[n].step; return 0; }

  function repoName(full) { var i = String(full || '').lastIndexOf('/'); return i < 0 ? String(full || '') : full.slice(i + 1); }
  function key(repo, n) { return repoName(repo) + '#' + n; }

  /* "ORISO-Frontend#1734" -> capability id, from epics, their sub-issues and nothing else. */
  function capabilityIndex(epics) {
    var idx = {}, repos = (epics && epics.repos) || [];
    ((epics && epics.epics) || []).forEach(function (e) {
      if (!e.b) return;
      idx[key(repos[e.r], e.n)] = e.b;
      (e.subs || []).forEach(function (s) { var k = key(repos[s[0]], s[1]); if (!(k in idx)) idx[k] = e.b; });
    });
    return idx;
  }
  function capabilityOf(item, idx) {
    var own = idx[key(item.repository, item.number)];
    if (own) return own;
    return item.parent ? idx[key(item.parent.repository, item.parent.number)] || null : null;
  }
  function round(v, d) { var f = Math.pow(10, d); return Math.round(v * f + 1e-9) / f; }

  function aggregate(board, epics) {
    var items = (board && board.items) || [], idx = capabilityIndex(epics), blocks = {}, unmapped = 0, ignored = 0, readinessMax = 0;
    items.forEach(function (it) {
      if (it.contentType === 'Issue' && typeof it.readiness === 'number' && it.readiness > readinessMax) readinessMax = it.readiness;
    });
    items.forEach(function (it) {
      if (it.contentType !== 'Issue' || !it.repository || typeof it.number !== 'number') { ignored++; return; }
      var id = capabilityOf(it, idx);
      if (!id) { unmapped++; return; }
      var b = blocks[id] || (blocks[id] = {total: 0, noStatus: 0, counts: {}, priority: {urgent: 0, high: 0, urgentHigh: 0}, rsum: 0, scored: 0, unscored: 0, findings: {total: 0, byRule: {}, items: []}});
      b.total++;
      if (STATUSES.indexOf(it.status) >= 0) b.counts[it.status] = (b.counts[it.status] || 0) + 1; else b.noStatus++;
      if (it.priority === 'Urgent') b.priority.urgent++; else if (it.priority === 'High') b.priority.high++;
      if (it.findings && it.findings.length) {
        var fi = {repository: it.repository, number: it.number, title: it.title, url: it.url, rules: [], details: {}};
        it.findings.forEach(function (f) { fi.rules.push(f.rule); fi.details[f.rule] = f.detail || {}; b.findings.byRule[f.rule] = (b.findings.byRule[f.rule] || 0) + 1; b.findings.total++; });
        b.findings.items.push(fi);
      }
      if (typeof it.readiness === 'number') { b.rsum += it.readiness; b.scored++; } else b.unscored++;
    });
    Object.keys(blocks).forEach(function (id) {
      var b = blocks[id], inBar = b.total - b.noStatus;
      b.priority.urgentHigh = b.priority.urgent + b.priority.high;
      b.segments = STATUSES.map(function (s) {
        var n = b.counts[s] || 0;
        return {status: s, group: GROUP[s], token: TOKEN[s], count: n, share: inBar ? round(100 * n / inBar, 2) : 0};
      });
      b.counts = STATUSES.reduce(function (o, s) { if (b.counts[s]) o[s] = b.counts[s]; return o; }, {});
      b.readiness = {avg: b.scored ? round(b.rsum / b.scored, 1) : null, scored: b.scored, unscored: b.unscored, max: b.scored ? readinessMax : 0};
      delete b.rsum; delete b.scored; delete b.unscored;
    });
    return {blocks: blocks, unmapped: unmapped, ignored: ignored, readinessMax: readinessMax};
  }

  /* ───── Epic side view (ORISO-Docs#206) ─────
     Sub-issues of one epic: board items whose parent is the epic, plus the epic's own sub-issue list
     (the same two links as capabilityIndex). Private repositories never reach board.json items; their
     sub-issues are only the epic's `hid` count. */
  var FILTERS = ['all', 'accepted', 'dev', 'staging', 'open'];
  var FILTER_STATUS = {accepted: 'Done', dev: 'QA internal', staging: 'QA external'};
  var GH = 'https://github.com/';
  function ghUrl(full, n) { return GH + full + '/issues/' + n; }
  function fullName(short, org) { return short.indexOf('/') < 0 ? org + '/' + short : short; }
  function matches(filter, it) {
    if (filter === 'all') return true;
    if (filter === 'open') return it.status !== 'Done' && it.state !== 'CLOSED';
    return it.status === FILTER_STATUS[filter];
  }
  function gateMatches(g, it) { return g === 'all' ? true : g === 'none' ? !it.gate : it.gate === g; }
  function epicView(board, epics, index, filter, gateFilter) {
    var repos = (epics && epics.repos) || [], e = epics && epics.epics && epics.epics[index];
    if (!board || !e) return null;
    var org = String((board.source && board.source.owner) || 'OpenResilienceInitiative');
    var ek = key(repos[e.r], e.n), seen = {}, items = [], onBoard = {};
    if (FILTERS.indexOf(filter) < 0) filter = 'all';
    var gateNames = GATES.map(function (g) { return g.name; });
    var gate = (gateFilter === 'none' || gateNames.indexOf(gateFilter) >= 0) ? gateFilter : 'all';
    (board.items || []).forEach(function (it) {
      if (it.contentType !== 'Issue' || !it.repository || typeof it.number !== 'number') return;
      var k = key(it.repository, it.number);
      if (k === ek) return;
      onBoard[k] = it;
    });
    function add(it, repoFull, k) {
      if (seen[k]) return; seen[k] = 1;
      items.push({repository: repoName(repoFull), number: it.number, title: it.title, url: it.url || ghUrl(repoFull, it.number),
        state: it.state, status: STATUSES.indexOf(it.status) >= 0 ? it.status : null, priority: it.priority || null,
        gate: it.gate || null, gateStep: gateStep(it.gate)});
    }
    Object.keys(onBoard).forEach(function (k) {
      var it = onBoard[k];
      if (it.parent && key(it.parent.repository, it.parent.number) === ek) add(it, it.repository, k);
    });
    (e.subs || []).forEach(function (s) {
      var k = key(repos[s[0]], s[1]);
      if (k === ek) return;
      if (onBoard[k]) add(onBoard[k], onBoard[k].repository, k);
      else add({number: s[1], title: s[2], state: s[3] === 'c' ? 'CLOSED' : 'OPEN', status: null}, fullName(repos[s[0]], org), k);
    });
    items.sort(function (a, b) { return a.number - b.number; });
    var counts = {}, filterCounts = {};
    FILTERS.forEach(function (f) { filterCounts[f] = items.filter(function (it) { return matches(f, it) && gateMatches(gate, it); }).length; });
    var gateCounts = {};
    ['all', 'none'].concat(gateNames).forEach(function (g) { gateCounts[g] = items.filter(function (it) { return matches(filter, it) && gateMatches(g, it); }).length; });
    items.forEach(function (it) { if (it.status) counts[it.status] = (counts[it.status] || 0) + 1; });
    var inBar = Object.keys(counts).reduce(function (a, s) { return a + counts[s]; }, 0);
    var segments = STATUSES.map(function (s) {
      var n = counts[s] || 0;
      return {status: s, group: GROUP[s], token: TOKEN[s], count: n, share: inBar ? round(100 * n / inBar, 2) : 0};
    });
    var shown = items.filter(function (it) { return matches(filter, it) && gateMatches(gate, it); });
    var groups = STATUSES.concat([null]).map(function (s) {
      var list = shown.filter(function (it) { return it.status === s; });
      return {status: s, group: s ? GROUP[s] : 'none', token: s ? TOKEN[s] : null, count: list.length, items: list};
    }).filter(function (g) { return g.items.length; });
    return {
      epic: {repository: repoName(repos[e.r]), number: e.n, title: e.t, url: ghUrl(fullName(repos[e.r], org), e.n)},
      total: items.length, privateCount: e.hid || 0, filter: filter, filterCounts: filterCounts,
      gate: gate, gateCounts: gateCounts, gateAvailable: items.some(function (it) { return !!it.gate; }), segments: segments, groups: groups
    };
  }
  /* ───── Branches and pull requests per task and per epic (ORISO-Docs#215) ─────
     board.json items carry `work` {branches, prs, hidden} (additive; boards from before #215 have none).
     A branch counts once per repository and name, however many tasks found it. `prs` counts OPEN pull requests;
     merged and closed ones are listed in the pop-up only. `hidden` = references in private repositories (a count, never names).
     Returns null when no item has work data, so the page shows no badge instead of zeros it does not know. */
  function itemSummary(it) {
    var wk = it.work, open = 0;
    (wk.prs || []).forEach(function (p) { if (p.state === 'OPEN') open++; });
    return {repository: repoName(it.repository), number: it.number, title: it.title, url: it.url,
      branches: (wk.branches || []).length, prs: open, hidden: wk.hidden || 0, branchList: wk.branches || [], prList: wk.prs || []};
  }
  function workIndex(board, epics) {
    var items = (board && board.items) || [], byItem = {}, any = false, repos = (epics && epics.repos) || [];
    items.forEach(function (it) {
      if (it.contentType !== 'Issue' || !it.repository || typeof it.number !== 'number' || !it.work) return;
      any = true; byItem[key(it.repository, it.number)] = itemSummary(it);
    });
    if (!any) return null;
    var children = {};
    items.forEach(function (it) {
      if (it.contentType === 'Issue' && it.parent && byItem[key(it.repository, it.number)]) {
        var pk = key(it.parent.repository, it.parent.number);
        (children[pk] || (children[pk] = [])).push(key(it.repository, it.number));
      }
    });
    var byEpic = {};
    ((epics && epics.epics) || []).forEach(function (e, i) {
      var ek = key(repos[e.r], e.n), keys = {}, order = [];
      function take(k) { if (byItem[k] && !keys[k]) { keys[k] = 1; order.push(k); } }
      take(ek);
      (children[ek] || []).forEach(take);
      (e.subs || []).forEach(function (s) { take(key(repos[s[0]], s[1])); });
      var branches = {}, prs = {}, hidden = 0, issues = [];
      order.forEach(function (k) {
        var x = byItem[k];
        hidden += x.hidden;
        x.branchList.forEach(function (b) { branches[b.repository + '\u0000' + b.name] = 1; });
        x.prList.forEach(function (p) { if (p.state === 'OPEN') prs[p.repository + '#' + p.number] = 1; });
        if (x.branchList.length || x.prList.length) issues.push(x);
      });
      issues.sort(function (a, b) { return a.number - b.number; });
      byEpic[i] = {branches: Object.keys(branches).length, prs: Object.keys(prs).length, hidden: hidden, issues: issues};
    });
    return {byItem: byItem, byEpic: byEpic};
  }
  /* Release scope (ORISO-Docs#209): what each Platform release holds, grouped into reviewed milestones. */
  var EFFORT_DAYS = {S: 2, M: 4, L: 8};
  var PRIORITIES = ['Urgent', 'High', 'Medium', 'Low'];
  function newScope(name) {
    return {name: name, total: 0, counts: {}, noStatus: 0, priority: {Urgent: 0, High: 0, Medium: 0, Low: 0, none: 0},
      effort: {S: 0, M: 0, L: 0, none: 0, days: 0}, capabilities: [], unmapped: 0};
  }
  function withSegments(sc) {
    var inBar = sc.total - sc.noStatus;
    sc.segments = STATUSES.map(function (s) {
      var n = sc.counts[s] || 0;
      return {status: s, group: GROUP[s], token: TOKEN[s], count: n, share: inBar ? round(100 * n / inBar, 2) : 0};
    });
    return sc;
  }
  function releases(board, epics) {
    var items = (board && board.items) || [], idx = capabilityIndex(epics), by = {}, noRelease = 0, caps = {};
    items.forEach(function (it) {
      if (it.contentType !== 'Issue') return;
      if (!it.platformRelease) { noRelease++; return; }
      var r = by[it.platformRelease] || (by[it.platformRelease] = newScope(it.platformRelease));
      caps[it.platformRelease] = caps[it.platformRelease] || {};
      r.total++;
      if (STATUSES.indexOf(it.status) >= 0) r.counts[it.status] = (r.counts[it.status] || 0) + 1; else r.noStatus++;
      if (PRIORITIES.indexOf(it.priority) >= 0) r.priority[it.priority]++; else r.priority.none++;
      if (EFFORT_DAYS[it.effort]) { r.effort[it.effort]++; r.effort.days += EFFORT_DAYS[it.effort]; } else r.effort.none++;
      var cap = itemCapability(it, idx);
      if (cap) caps[it.platformRelease][cap] = true; else r.unmapped++;
    });
    Object.keys(by).forEach(function (n) {
      by[n].counts = STATUSES.reduce(function (o, s) { if (by[n].counts[s]) o[s] = by[n].counts[s]; return o; }, {});
      by[n].capabilities = Object.keys(caps[n]).sort();
      withSegments(by[n]);
    });
    return {byName: by, noRelease: noRelease};
  }
  function itemCapability(it, idx) { return typeof it.number === 'number' && it.repository ? capabilityOf(it, idx) : null; }
  function sumScopes(list) {
    var t = newScope(''), caps = {};
    list.forEach(function (r) {
      t.total += r.total; t.noStatus += r.noStatus; t.unmapped += r.unmapped;
      Object.keys(r.counts).forEach(function (s) { t.counts[s] = (t.counts[s] || 0) + r.counts[s]; });
      Object.keys(r.priority).forEach(function (p) { t.priority[p] += r.priority[p]; });
      Object.keys(r.effort).forEach(function (k) { t.effort[k] += r.effort[k]; });
      r.capabilities.forEach(function (c) { caps[c] = true; });
    });
    t.capabilities = Object.keys(caps).sort();
    return withSegments(t);
  }
  /* config = tools/planning-map/milestones.json; rel = releases(). Order follows the config. */
  function milestones(config, rel) {
    var by = (rel && rel.byName) || {}, listed = {};
    var ms = ((config && config.milestones) || []).map(function (m) {
      var rs = (m.releases || []).map(function (n) { listed[n] = true; return by[n] || withSegments(newScope(n)); });
      var t = sumScopes(rs);
      t.id = m.id; t.title = m.title; t.releases = rs; delete t.name;
      return t;
    });
    var unlisted = Object.keys(by).filter(function (n) { return !listed[n]; }).sort().map(function (n) { return by[n]; });
    return {milestones: ms, unlisted: unlisted};
  }
  function releaseCapabilities(rel, name) {
    var r = name && rel && rel.byName && rel.byName[name];
    return r ? r.capabilities.slice() : [];
  }
  return {GATES: GATES, gateStep: gateStep, STATUSES: STATUSES, GROUP: GROUP, TOKEN: TOKEN, FILTERS: FILTERS, EFFORT_DAYS: EFFORT_DAYS, PRIORITIES: PRIORITIES, capabilityIndex: capabilityIndex, aggregate: aggregate, epicView: epicView, workIndex: workIndex, releases: releases, milestones: milestones, releaseCapabilities: releaseCapabilities};
});

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
      var b = blocks[id] || (blocks[id] = {total: 0, noStatus: 0, counts: {}, priority: {urgent: 0, high: 0, urgentHigh: 0}, rsum: 0, scored: 0, unscored: 0});
      b.total++;
      if (STATUSES.indexOf(it.status) >= 0) b.counts[it.status] = (b.counts[it.status] || 0) + 1; else b.noStatus++;
      if (it.priority === 'Urgent') b.priority.urgent++; else if (it.priority === 'High') b.priority.high++;
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
  return {EFFORT_DAYS: EFFORT_DAYS, PRIORITIES: PRIORITIES, releases: releases, milestones: milestones, releaseCapabilities: releaseCapabilities, STATUSES: STATUSES, GROUP: GROUP, TOKEN: TOKEN, capabilityIndex: capabilityIndex, aggregate: aggregate};
});

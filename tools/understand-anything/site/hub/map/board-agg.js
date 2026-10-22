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
  return {STATUSES: STATUSES, GROUP: GROUP, TOKEN: TOKEN, capabilityIndex: capabilityIndex, aggregate: aggregate};
});

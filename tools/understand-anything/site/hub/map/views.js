/* View switch of the capability map: State | Health | Plan (ORISO-Docs#214, epic #213).
   Classic script (no module syntax) so the page and node --test load the same file.

   Hash: "#view=<state|health|plan>&node=<node id>". The node id is the one of the deep links (#199);
   "#node=<id>" alone is the State view, so every existing link keeps working. The node carries zoom path
   and selection, so switching views keeps the same area open.

   Hooks, one object per view in VIEWS (add a layer by filling in your view, no change to map.js):
     title        {de, en}   label of the switch button
     legend(lang) string     plain text under the map; '' keeps the default legend of the State view
     colour(block) string|null  colour token name (assets/tokens.css, without "--") that fills the squares
                              of this block; null keeps the State layers
     panel(block, lang) string  HTML (escaped by the view) added on top of the block detail; '' for none
   #217/#218 fill VIEWS.health, #223 fills VIEWS.plan. Details: hub README, "Views". */
(function (root, factory) {
  root.MapViews = factory();
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  var DEFAULT_VIEW = 'state';
  var VIEW_IDS = ['state', 'health', 'plan'];
  var NODE_MAX = 512;

  function comingView(title, text) {
    function legend(lang) { return text[lang === 'en' ? 'en' : 'de']; }
    return {
      title: title,
      legend: legend,
      colour: function () { return 'neutral'; },
      panel: function (block, lang) { return '<p class="vnote">' + legend(lang) + '</p>'; }
    };
  }

  var VIEWS = {
    state: {
      title: {de: 'Stand', en: 'State'},
      legend: function () { return ''; },
      colour: function () { return null; },
      panel: function () { return ''; }
    },
    health: comingView({de: 'Gesundheit', en: 'Health'}, {
      de: 'Gesundheit folgt: Die Quadrate bleiben neutral, bis die Prüfläufe angebunden sind.',
      en: 'Health is coming: the squares stay neutral until the health runs are connected.'}),
    plan: comingView({de: 'Plan', en: 'Plan'}, {
      de: 'Plan folgt: Die Quadrate bleiben neutral, bis die Ideen-Ebene angebunden ist.',
      en: 'Plan is coming: the squares stay neutral until the idea layer is connected.'})
  };

  function decode(s) { try { return decodeURIComponent(s); } catch (e) { return null; } }
  function validNode(id) { return id !== null && id.length > 0 && id.length <= NODE_MAX && !/[\u0000-\u001f\u007f]/.test(id); }

  /* "&" only separates when a known key follows, so a legacy "#node=" id with a raw "&" survives. */
  function parseHash(hash) {
    var out = {view: DEFAULT_VIEW, node: null, hasView: false};
    var h = String(hash || '').replace(/^#/, '');
    if (!h) return out;
    h.split(/&(?=(?:view|node)=)/).forEach(function (part) {
      var i = part.indexOf('='); if (i < 0) return;
      var k = part.slice(0, i), v = part.slice(i + 1);
      if (k === 'view') { if (VIEW_IDS.indexOf(v) >= 0) { out.view = v; out.hasView = true; } }
      else if (k === 'node') { var d = decode(v); out.node = validNode(d) ? d : null; }
    });
    return out;
  }

  function buildHash(view, node) {
    var parts = [];
    if (VIEW_IDS.indexOf(view) > 0) parts.push('view=' + view);
    if (node) parts.push('node=' + encodeURIComponent(node));
    return parts.length ? '#' + parts.join('&') : '';
  }

  return {DEFAULT_VIEW: DEFAULT_VIEW, VIEW_IDS: VIEW_IDS, VIEWS: VIEWS, parseHash: parseHash, buildHash: buildHash};
});

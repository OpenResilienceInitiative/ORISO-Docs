// Independent WCAG / CIE helpers for the colour tests (not shared with production code).
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
export const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lum = v => 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
const hexLum = h => lum(rgb(h).map(lin));
export const contrast = (a, b) => {
  const x = hexLum(a), y = hexLum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const Lstar = y => (y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : (y * 24389) / 27);
// Machado, Oliveira, Fernandes 2009, severity 1.0, applied in linear sRGB.
const M = {
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
};
// A simulated colour is returned as linear RGB triple; lightness() accepts hex or triple.
export const simulate = (hex, kind) => {
  const v = rgb(hex).map(lin);
  return M[kind].map(r => Math.min(1, Math.max(0, r[0] * v[0] + r[1] * v[1] + r[2] * v[2])));
};
export const lightness = c => Lstar(typeof c === 'string' ? hexLum(c) : lum(c));

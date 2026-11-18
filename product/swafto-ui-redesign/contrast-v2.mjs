// WCAG contrast for palette v2. Formula replicated from apps/mobile/test/a11y.tsx:
// sRGB linearisation threshold 0.04045, no rounding; L = .2126R+.7152G+.0722B; (hi+.05)/(lo+.05).
const raw = `
bg #FFF6EA #1A1410
surface #FFFFFF #261E18
surfaceRaised #F6EADA #30261E
ink #2B2118 #F6EDE2
inkMuted #5E4E41 #BFAF9E
edge #8A7560 #9C8A78
border #E6D5BF #3E3126
borderStrong #C9BCA3 #54463A
brand #0A6B66 #4FC3BA
onBrand #FFFFFF #10201F
brandPressed #08524E #3AA79F
brandSoft #0A6B66 #4FC3BA
header #0A6B66 #261E18
onHeader #FFFFFF #F6EDE2
accent #F5A524 #F5A524
accentPressed #DB9317 #DB9317
onAccent #12181F #12181F
positive #1E6B2E #6FD48A
negative #A3410C #F2A06A
success #1E6B2E #6FD48A
warning #6B4400 #F2CF7A
info #24508F #8FB0E4
selected #0A6B66 #4FC3BA
onSelected #FFFFFF #10201F
tintRed #FCE8E4 #331C18
tintGold #FFE9B8 #3A2E12
tintIndigo #E7EBF2 #1B2436
tintSale #DDF3EF #12302D
inkSale #0A6B66 #7EE0D8
tintUdhar #EDE4F7 #2A1F3D
inkUdhar #5B2E91 #CDB2F0
tintCollect #E3F2D6 #1F3018
inkCollect #2F6B1B #A5DB86
tintExpense #FDE6D3 #3A2412
inkExpense #8F4408 #FFB27A
tintMore #EFE7DC #30261E
inkMore #5E4E41 #BFAF9E`;
const palette = {};
for (const l of raw.trim().split('\n')) { const [k, a, b] = l.split(' '); palette[k] = { comfort: a, focus: b }; }

const channel = (c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
function luminance(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex); if (!m) throw new Error('bad colour ' + hex);
  const n = parseInt(m[1], 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}
function contrast(a, b) { const la = luminance(a), lb = luminance(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); }
const floor2 = (r) => (Math.floor(r * 100 + 1e-9) / 100).toFixed(2);

function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16); const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) { s = d / (1 - Math.abs(2 * l - 1)); if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  return [h, s, l];
}
function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const f = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return ('#' + f(r) + f(g) + f(b)).toUpperCase();
}
// smallest |dL| (1% steps) of the moving colour that reaches threshold+0.1
function suggest(movingHex, otherHex, thr) {
  const [h, s, l0] = hexToHsl(movingHex); const l100 = Math.round(l0 * 100);
  for (let d = 1; d <= 100; d++) {
    const cands = [];
    for (const sign of [-1, 1]) { const L = l100 + sign * d; if (L < 0 || L > 100) continue; const hx = hslToHex(h, s, L / 100); cands.push({ hx, L, r: contrast(hx, otherHex) }); }
    const ok = cands.filter((c) => c.r >= thr + 0.1).sort((a, b) => b.r - a.r);
    if (ok.length) return ok[0];
  }
  return null;
}

const T = 4.5, N = 3;
const TEXT = [], NONTEXT = [], INFO = [];
const textInks = ['ink', 'inkMuted', 'positive', 'negative', 'brandSoft', 'success', 'warning', 'info'];
let i = 0;
const add = (arr, pre, role, fg, bg, thr, extra) => arr.push({ id: pre + (++i), role, fg, bg, thr, extra });
const A = (role, fg, bg) => add(TEXT, 'T', role, fg, bg, T);
for (const fg of textInks) for (const bg of ['bg', 'surface', 'surfaceRaised']) A('a) body text', fg, bg);
for (const [f, b] of [['onBrand','brand'],['onBrand','brandPressed'],['onHeader','header'],['onSelected','selected'],['onAccent','accent'],['onAccent','accentPressed']]) A('b) on-fill text', f, b);
for (const t of ['tintRed','tintGold','tintIndigo','tintSale','tintUdhar','tintCollect','tintExpense','tintMore']) A('c) ink on tint', 'ink', t);
A('d) warning on gold', 'warning', 'tintGold'); A('d) info on indigo', 'info', 'tintIndigo'); A('d) negative on red', 'negative', 'tintRed');
for (const k of ['Sale','Udhar','Collect','Expense','More']) { A('e) tile icon on disc', 'ink' + k, 'surface'); A('e) icon/initial on own tint', 'ink' + k, 'tint' + k); }
A('e) muted on raised', 'inkMuted', 'surfaceRaised');
A('f) hero money', 'positive', 'surface'); A('f) hero money', 'negative', 'surface'); A('f) ink on raised', 'ink', 'surfaceRaised'); A('f) brand text on tint', 'brandSoft', 'tintSale');
i = 0;
const NT = (role, fg, bg) => add(NONTEXT, 'N', role, fg, bg, N);
for (const b of ['bg','surface','surfaceRaised']) NT('edge (control boundary)', 'edge', b);
NT('inkMuted/bg (tokens.spec)', 'inkMuted', 'bg');
for (const b of ['bg','surface','surfaceRaised','tintSale']) NT('brand graphic', 'brand', b);
NT('brandPressed graphic', 'brandPressed', 'bg'); NT('progress fill vs track', 'brand', 'border');
NT('sync chip border', 'warning', 'bg'); NT('sync chip border', 'warning', 'surface');
NT('switch thumb on ON track', 'onBrand', 'brand'); NT('switch thumb on OFF track', 'inkMuted', 'surfaceRaised');
i = 0;
const I = (role, fg, bg) => add(INFO, 'I', role, fg, bg, null);
I('header vs bg (INFO only)', 'header', 'bg');
INFO.push({ id: 'I' + (++i), role: 'borderStrong/bg must be <3 (tokens.spec)', fg: 'borderStrong', bg: 'bg', thr: null, extra: 'lt3' });
I('border vs bg', 'border', 'bg'); I('border vs surface', 'border', 'surface');
for (const k of ['Sale','Udhar','Collect','Expense','More']) I('tinted tile vs screen', 'tint' + k, 'bg');
I('edge vs border', 'edge', 'border');

const out = [];
const sugg = (mode, fg, bg, thr) => {
  const fh = palette[fg][mode], bh = palette[bg][mode];
  const r = suggest(fh, bh, thr);
  return r ? `${fg} ${fh} -> ${r.hx} (L ${r.L}%) ${r.r.toFixed(4)}` : 'none found';
};
const summary = {};
for (const mode of ['comfort', 'focus']) {
  out.push(`\n# Mode: ${mode}\n`);
  let n = 0, f = 0; const fails = [];
  const sect = (title, arr) => {
    out.push(`\n## ${title}\n`);
    out.push('| id | role | fg | bg | exact | floor2 | thr | result |'); out.push('|---|---|---|---|---|---|---|---|');
    for (const p of arr) {
      const fh = palette[p.fg][mode], bh = palette[p.bg][mode]; const r = contrast(fh, bh);
      let res = '-', thr = '-';
      if (p.thr != null) { thr = p.thr; res = r >= p.thr ? 'PASS' : 'FAIL'; n++; if (res === 'FAIL') { f++; fails.push([p, r]); } }
      else if (p.extra === 'lt3') { thr = '<3'; res = r < 3 ? 'PASS' : 'FAIL'; n++; if (res === 'FAIL') { f++; } }
      out.push(`| ${p.id} | ${p.role} | ${p.fg} ${fh} | ${p.bg} ${bh} | ${r.toFixed(4)} | ${floor2(r)} | ${thr} | ${res} |`);
    }
  };
  sect('TEXT (4.5)', TEXT); sect('NONTEXT (3)', NONTEXT); sect('INFO', INFO);
  out.push('\n## Suggestions for FAILs (HSL lightness of fg/fill only, 1% steps, margin >= 0.1)\n');
  if (!fails.length) out.push('none');
  for (const [p, r] of fails) out.push(`- ${p.id} ${p.fg} on ${p.bg} (${r.toFixed(4)}, need ${p.thr}): ${sugg(mode, p.fg, p.bg, p.thr)}`);
  summary[mode] = [n, f];
}
out.push(`\nSUMMARY comfort: ${summary.comfort[0]} pairs, ${summary.comfort[1]} failures; focus: ${summary.focus[0]} pairs, ${summary.focus[1]} failures`);
out.push(`\nSANITY white/#B87214 = ${contrast('#FFFFFF','#B87214').toFixed(4)}; black/white = ${contrast('#000000','#FFFFFF').toFixed(4)}`);
console.log(out.join('\n'));

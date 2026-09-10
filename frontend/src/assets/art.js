/**
 * Self-contained SVG artwork as data URLs.
 * Bundled locally so the dashboard renders fully offline — field demos cannot
 * rely on reaching an image CDN.
 */

const encode = (svg) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;

const scene = ({ sky, ground, accent, motif }) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${sky[0]}"/><stop offset="100%" stop-color="${sky[1]}"/>
    </linearGradient>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${ground[0]}"/><stop offset="100%" stop-color="${ground[1]}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="200" fill="url(#s)"/>
  <circle cx="330" cy="42" r="24" fill="${accent}" opacity="0.85"/>
  <path d="M0 128 Q 70 104 140 124 T 280 118 T 400 130 V200 H0 Z" fill="url(#g)"/>
  <path d="M0 156 Q 100 138 200 154 T 400 148 V200 H0 Z" fill="${ground[1]}" opacity="0.75"/>
  ${motif}
</svg>`;

const leafMotif = `
  <g fill="#166534" opacity="0.9">
    <path d="M150 168 C150 140 172 126 196 124 C196 150 176 168 150 168 Z"/>
    <path d="M150 168 C150 144 132 130 110 128 C110 152 128 168 150 168 Z"/>
  </g>
  <rect x="148" y="160" width="4" height="34" rx="2" fill="#14532d"/>`;

const bugMotif = `
  <g fill="#7c2d12">
    <ellipse cx="190" cy="158" rx="26" ry="20"/>
    <circle cx="190" cy="134" r="11"/>
  </g>
  <g stroke="#7c2d12" stroke-width="3" stroke-linecap="round">
    <path d="M166 148 L146 138 M166 160 L144 160 M166 172 L148 182"/>
    <path d="M214 148 L234 138 M214 160 L236 160 M214 172 L232 182"/>
  </g>
  <path d="M190 138 V178" stroke="#fed7aa" stroke-width="3"/>`;

const sensorMotif = `
  <rect x="168" y="120" width="64" height="46" rx="8" fill="#0f2a1e"/>
  <rect x="176" y="128" width="48" height="30" rx="4" fill="#4ade80" opacity="0.85"/>
  <path d="M180 148 L192 136 L202 150 L212 132 L220 144" stroke="#0f2a1e" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="196" y="166" width="8" height="26" rx="3" fill="#0f2a1e"/>`;

const soilMotif = `
  <g fill="#78350f" opacity="0.9">
    <rect x="130" y="150" width="140" height="44" rx="8"/>
  </g>
  <g fill="#a16207" opacity="0.7">
    <circle cx="156" cy="166" r="5"/><circle cx="182" cy="176" r="4"/>
    <circle cx="216" cy="164" r="6"/><circle cx="244" cy="178" r="4"/>
  </g>
  <g stroke="#15803d" stroke-width="4" stroke-linecap="round" fill="none">
    <path d="M170 150 V126"/><path d="M200 150 V118"/><path d="M230 150 V128"/>
  </g>
  <g fill="#22c55e">
    <circle cx="170" cy="122" r="7"/><circle cx="200" cy="114" r="8"/><circle cx="230" cy="124" r="7"/>
  </g>`;

const fertilizerMotif = `
  <path d="M172 118 h56 l-8 76 h-40 Z" fill="#f0fdf4" stroke="#15803d" stroke-width="3"/>
  <rect x="182" y="106" width="36" height="14" rx="4" fill="#15803d"/>
  <g fill="#15803d" font-family="sans-serif" font-size="18" font-weight="700">
    <text x="200" y="162" text-anchor="middle">NPK</text>
  </g>`;

const waterMotif = `
  <g fill="#0ea5e9" opacity="0.9">
    <path d="M200 108 C218 134 230 148 230 162 a30 30 0 0 1 -60 0 c0 -14 12 -28 30 -54 Z"/>
  </g>
  <g fill="#38bdf8" opacity="0.75">
    <circle cx="152" cy="150" r="9"/><circle cx="250" cy="144" r="7"/>
  </g>`;

export const ART = {
  disease: encode(
    scene({
      sky: ['#dcfce7', '#bbf7d0'],
      ground: ['#22c55e', '#15803d'],
      accent: '#fde68a',
      motif: leafMotif,
    }),
  ),
  pest: encode(
    scene({
      sky: ['#fef3c7', '#fde68a'],
      ground: ['#65a30d', '#3f6212'],
      accent: '#fb923c',
      motif: bugMotif,
    }),
  ),
  sensor: encode(
    scene({
      sky: ['#e0f2fe', '#bae6fd'],
      ground: ['#16a34a', '#14532d'],
      accent: '#facc15',
      motif: sensorMotif,
    }),
  ),
  nutrient: encode(
    scene({
      sky: ['#f0fdf4', '#d9f99d'],
      ground: ['#84cc16', '#4d7c0f'],
      accent: '#fbbf24',
      motif: soilMotif,
    }),
  ),
  fertilizer: encode(
    scene({
      sky: ['#ecfdf5', '#a7f3d0'],
      ground: ['#10b981', '#065f46'],
      accent: '#fcd34d',
      motif: fertilizerMotif,
    }),
  ),
  irrigation: encode(
    scene({
      sky: ['#e0f2fe', '#7dd3fc'],
      ground: ['#0ea5e9', '#0c4a6e'],
      accent: '#fef9c3',
      motif: waterMotif,
    }),
  ),
};

/** Wide banner used behind the dashboard hero and the login card. */
export const HERO_ART = encode(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 320" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0b2117"/><stop offset="100%" stop-color="#14532d"/>
    </linearGradient>
    <linearGradient id="f1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#16a34a"/><stop offset="100%" stop-color="#14532d"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="320" fill="url(#sky)"/>
  <circle cx="980" cy="72" r="44" fill="#fbbf24" opacity="0.5"/>
  <path d="M0 190 Q 200 150 400 182 T 800 172 T 1200 192 V320 H0 Z" fill="url(#f1)" opacity="0.55"/>
  <path d="M0 234 Q 240 200 480 230 T 960 220 T 1200 238 V320 H0 Z" fill="#22c55e" opacity="0.3"/>
  <g stroke="#4ade80" stroke-width="3" stroke-linecap="round" opacity="0.45" fill="none">
    <path d="M120 300 V250 M120 268 l-18 -14 M120 262 l18 -16"/>
    <path d="M300 306 V254 M300 272 l-18 -14 M300 266 l18 -16"/>
    <path d="M1080 300 V248 M1080 266 l-18 -14 M1080 260 l18 -16"/>
  </g>
</svg>`);

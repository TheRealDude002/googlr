/**
 * The Googlr wordmark — an inline SVG, deliberately grey.
 * Playfair Display Black letterforms, individually positioned,
 * embossed like brushed metal: a ghost of Google.
 */

const LETTERS: Array<{ ch: string; x: number }> = [
  { ch: 'G', x: 26 },
  { ch: 'o', x: 88 },
  { ch: 'o', x: 136 },
  { ch: 'g', x: 184 },
  { ch: 'l', x: 232 },
  { ch: 'r', x: 262 },
];

export default function GooglrLogo() {
  return (
    <div className="logo-svg-wrap">
      <svg
        viewBox="0 0 320 90"
        width="100%"
        height="100%"
        role="img"
        aria-label="Googlr"
      >
        <defs>
          <linearGradient id="googlr-metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c0bab2" />
            <stop offset="100%" stopColor="#9a9288" />
          </linearGradient>
          <filter id="googlr-emboss" x="-20%" y="-20%" width="140%" height="150%">
            {/* white shadow just below the letterforms = highlight */}
            <feDropShadow dx="0" dy="1" stdDeviation="0.4" floodColor="#ffffff" floodOpacity="0.9" />
            {/* dark shadow just above = depth */}
            <feDropShadow dx="0" dy="-1" stdDeviation="0.4" floodColor="#6b6157" floodOpacity="0.6" />
          </filter>
        </defs>
        {LETTERS.map((letter, i) => (
          <text
            key={i}
            x={letter.x}
            y="64"
            fontFamily="'Playfair Display', 'Times New Roman', serif"
            fontWeight="900"
            fontSize="76"
            fill="url(#googlr-metal)"
            filter="url(#googlr-emboss)"
          >
            {letter.ch}
          </text>
        ))}
      </svg>
    </div>
  );
}

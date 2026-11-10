/**
 * Googlr's skeuomorphic icons — hand-drawn inline SVGs that share the
 * app's material palette (brass, glass, ink, glossy thumbtack lacquer)
 * instead of flat emoji glyphs.
 *
 * MagnifierIcon → vintage brass magnifying glass (CTA button)
 * PushpinIcon   → glossy red pushpin, same lacquer as the board tacks
 */

export function MagnifierIcon() {
  return (
    <svg viewBox="0 0 48 48" className="icon" aria-hidden="true" focusable="false">
      <defs>
        {/* brass rim — lit from above */}
        <linearGradient id="googlr-mag-brass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e9d3a0" />
          <stop offset="45%" stopColor="#c4a265" />
          <stop offset="100%" stopColor="#8f6f3a" />
        </linearGradient>
        {/* glass lens — faint teal tint, the app's accent */}
        <radialGradient id="googlr-mag-glass" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#f2f6f4" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#357070" stopOpacity="0.35" />
        </radialGradient>
        {/* turned wooden handle */}
        <linearGradient id="googlr-mag-handle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5c4f3a" />
          <stop offset="100%" stopColor="#2a2016" />
        </linearGradient>
      </defs>

      {/* handle + its top highlight */}
      <line
        x1="30.8"
        y1="30.8"
        x2="41.6"
        y2="41.6"
        stroke="url(#googlr-mag-handle)"
        strokeWidth="6.4"
        strokeLinecap="round"
      />
      <line
        x1="31.4"
        y1="30.5"
        x2="40.8"
        y2="39.9"
        stroke="rgba(255, 255, 255, 0.35)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* brass rim */}
      <circle cx="20" cy="20" r="14.6" fill="url(#googlr-mag-brass)" />
      <circle cx="20" cy="20" r="14.6" fill="none" stroke="rgba(42, 32, 22, 0.38)" strokeWidth="1" />

      {/* lens */}
      <circle
        cx="20"
        cy="20"
        r="11.2"
        fill="url(#googlr-mag-glass)"
        stroke="rgba(42, 32, 22, 0.3)"
        strokeWidth="0.9"
      />

      {/* glass shine */}
      <path
        d="M 12.6 17 A 9.6 9.6 0 0 1 19.2 10.8"
        fill="none"
        stroke="rgba(255, 255, 255, 0.9)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PushpinIcon() {
  return (
    <svg viewBox="0 0 48 48" className="icon" aria-hidden="true" focusable="false">
      <defs>
        {/* head lacquer — identical stops to .tack-red */}
        <radialGradient id="googlr-pin-head" cx="32%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#f2867c" />
          <stop offset="45%" stopColor="#e74c3c" />
          <stop offset="100%" stopColor="#922b21" />
        </radialGradient>
        <radialGradient id="googlr-pin-spark" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="70%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        {/* steel needle */}
        <linearGradient id="googlr-pin-steel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f2f0ea" />
          <stop offset="55%" stopColor="#b8b2a6" />
          <stop offset="100%" stopColor="#847d6f" />
        </linearGradient>
        {/* brass collar */}
        <linearGradient id="googlr-pin-brass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e9d3a0" />
          <stop offset="100%" stopColor="#8f6f3a" />
        </linearGradient>
      </defs>

      {/* tilted like it's being pressed into the cork */}
      <g transform="rotate(14 24 24)">
        {/* needle */}
        <path d="M 22.9 26.5 L 25.1 26.5 L 24.35 43 L 23.65 43 Z" fill="url(#googlr-pin-steel)" />
        {/* collar */}
        <path
          d="M 20.6 23.2 L 27.4 23.2 L 26.4 27.2 L 21.6 27.2 Z"
          fill="url(#googlr-pin-brass)"
          stroke="rgba(42, 32, 22, 0.25)"
          strokeWidth="0.6"
        />
        {/* glossy head */}
        <circle
          cx="24"
          cy="14.5"
          r="10.8"
          fill="url(#googlr-pin-head)"
          stroke="rgba(0, 0, 0, 0.22)"
          strokeWidth="0.8"
        />
        {/* specular highlight, upper-left light like the board tacks */}
        <ellipse cx="20.6" cy="10.8" rx="3.4" ry="2.5" fill="url(#googlr-pin-spark)" />
      </g>
    </svg>
  );
}

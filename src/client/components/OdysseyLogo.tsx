export const OdysseyLogo = () => {
  return (
    <svg
      width="1024"
      height="256"
      viewBox="0 0 1024 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
    >
      <defs>
        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <linearGradient id="titleGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#9EE7FF" />
          <stop offset="100%" stopColor="#4AD2FF" />
        </linearGradient>

        <style>
          {`
            @keyframes orbit-spin {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
            .orbit {
              transform-origin: 128px 128px;
              animation: orbit-spin 6s linear infinite;
            }
            .small-star { opacity: .9; }
          `}
        </style>
      </defs>

      <rect width="1024" height="256" fill="none" />

      <g transform="translate(0,0)">
        <circle cx="128" cy="128" r="86" stroke="#5EE3FF" strokeOpacity="0.65" strokeWidth="2" />
        <circle cx="128" cy="128" r="42" fill="#0F172A" />
        <circle cx="128" cy="128" r="42" fill="url(#titleGrad)" opacity=".07" />
        <g className="orbit" filter="url(#softGlow)">
          <ellipse cx="128" cy="128" rx="92" ry="46" stroke="#7CF3FF" strokeWidth="3" fill="none" />
          <circle className="small-star" cx="220" cy="128" r="5" fill="#BDF4FF" />
        </g>
        <circle cx="158" cy="98" r="3" fill="#E6FBFF" />
        <circle cx="110" cy="160" r="2" fill="#E6FBFF" />
      </g>

      <g transform="translate(240, 70)" filter="url(#softGlow)">
        <text
          x="0"
          y="0"
          fill="url(#titleGrad)"
          fontFamily="Orbitron, Rajdhani, 'Eurostile', 'Segoe UI', Roboto, sans-serif"
          fontWeight="700"
          fontSize="72"
          letterSpacing="1.5"
        >
          Odyssey
        </text>
        <text
          x="0"
          y="70"
          fill="#C7EFFF"
          fontFamily="Rajdhani, 'Segoe UI', Roboto, sans-serif"
          fontWeight="500"
          fontSize="44"
          letterSpacing="2"
        >
          Protocol
        </text>

        <path
          d="M 4 86 C 160 110, 320 110, 520 92"
          stroke="#7CF3FF"
          strokeWidth="2"
          fill="none"
          opacity=".65"
        />
      </g>
    </svg>
  );
};

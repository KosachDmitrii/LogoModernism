import type { ReactNode } from 'react';

type CaseId = 'fintech' | 'architecture' | 'culture';

function Frame({ children, tone = 'paper' }: { children: ReactNode; tone?: 'paper' | 'chaos' }) {
  return (
    <div
      className={
        tone === 'chaos'
          ? 'relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-[#f3f0ea]'
          : 'relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-[#f7f7f5]'
      }
    >
      {children}
    </div>
  );
}

function FintechBefore() {
  return (
    <Frame tone="chaos">
      <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
        <circle cx="72" cy="74" r="40" fill="#c4b5fd" opacity="0.9" />
        <circle cx="98" cy="58" r="24" fill="#f9a8d4" opacity="0.75" />
        <rect x="148" y="42" width="88" height="68" rx="16" fill="#7dd3fc" opacity="0.8" />
        <path
          d="M36 142 C78 104, 118 176, 158 132 S220 96, 268 148"
          stroke="#f59e0b"
          strokeWidth="11"
          fill="none"
          strokeLinecap="round"
        />
        <rect
          x="228"
          y="118"
          width="50"
          height="50"
          fill="#4ade80"
          opacity="0.55"
          transform="rotate(16 253 143)"
        />
        <text x="196" y="98" fontFamily="Arial, sans-serif" fontSize="46" fontWeight="700" fill="#7c3aed" transform="rotate(-14 220 90)">
          N
        </text>
        <text x="44" y="172" fontFamily="Georgia, serif" fontSize="26" fill="#3f3f46" opacity="0.7">
          NovaPay$
        </text>
      </svg>
    </Frame>
  );
}

function FintechAfter1() {
  return (
    <Frame>
      <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
        <g stroke="#e7e5e4" strokeWidth="1">
          <path d="M48 48 H272 M48 88 H272 M48 128 H272 M48 168 H272" />
          <path d="M48 48 V168 M88 48 V168 M128 48 V168 M168 48 V168 M208 48 V168 M248 48 V168" />
        </g>
        <g fill="#171717">
          <rect x="64" y="72" width="14" height="56" />
          <rect x="86" y="72" width="38" height="14" />
          <rect x="86" y="114" width="38" height="14" />
          <rect x="140" y="72" width="14" height="56" />
          <rect x="170" y="72" width="46" height="14" />
          <rect x="170" y="92" width="14" height="36" />
          <rect x="202" y="114" width="14" height="14" />
          <rect x="232" y="72" width="14" height="56" />
          <rect x="254" y="72" width="30" height="14" />
        </g>
      </svg>
    </Frame>
  );
}

function FintechAfter2() {
  return (
    <Frame>
      <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
        <circle cx="160" cy="88" r="48" fill="none" stroke="#171717" strokeWidth="9" />
        <path
          d="M144 66 V112 H176"
          fill="none"
          stroke="#171717"
          strokeWidth="9"
          strokeLinecap="square"
        />
        <text
          x="160"
          y="168"
          textAnchor="middle"
          fontFamily="DM Sans, Helvetica, sans-serif"
          fontSize="17"
          fontWeight="600"
          letterSpacing="4"
          fill="#171717"
        >
          NOVAPAY
        </text>
      </svg>
    </Frame>
  );
}

function FintechAfter3() {
  return (
    <Frame>
      <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
        <rect x="122" y="44" width="76" height="76" fill="#171717" />
        <rect x="140" y="62" width="40" height="40" fill="#f7f7f5" />
        <rect x="156" y="78" width="8" height="24" fill="#171717" />
        <text
          x="160"
          y="160"
          textAnchor="middle"
          fontFamily="DM Sans, Helvetica, sans-serif"
          fontSize="15"
          fontWeight="600"
          letterSpacing="5"
          fill="#171717"
        >
          NOVAPAY
        </text>
      </svg>
    </Frame>
  );
}

function ArchitectureBefore() {
  return (
    <Frame tone="chaos">
      <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
        <polygon points="48,148 96,52 144,148" fill="#fb923c" opacity="0.85" />
        <rect x="156" y="72" width="46" height="76" fill="#60a5fa" opacity="0.75" />
        <rect x="214" y="44" width="28" height="104" fill="#c084fc" opacity="0.7" />
        <circle cx="256" cy="138" r="26" fill="#34d399" opacity="0.55" />
        <text x="48" y="176" fontFamily="Georgia, serif" fontSize="20" fill="#57534e">
          Studio Arc *
        </text>
      </svg>
    </Frame>
  );
}

function ArchitectureAfter1() {
  return (
    <Frame>
      <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
        <g fill="none" stroke="#171717" strokeWidth="3">
          <rect x="112" y="40" width="96" height="96" />
          <line x1="112" y1="88" x2="208" y2="88" />
          <line x1="160" y1="40" x2="160" y2="136" />
          <circle cx="160" cy="88" r="16" />
        </g>
        <text
          x="160"
          y="168"
          textAnchor="middle"
          fontFamily="DM Sans, Helvetica, sans-serif"
          fontSize="15"
          fontWeight="600"
          letterSpacing="6"
          fill="#171717"
        >
          ATELIER
        </text>
      </svg>
    </Frame>
  );
}

function ArchitectureAfter2() {
  return (
    <Frame>
      <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
        <line x1="40" y1="64" x2="280" y2="64" stroke="#d6d3d1" strokeWidth="1" />
        <text
          x="40"
          y="112"
          fontFamily="DM Sans, Helvetica, sans-serif"
          fontSize="42"
          fontWeight="700"
          letterSpacing="-1"
          fill="#171717"
        >
          ATELIER
        </text>
        <line x1="40" y1="126" x2="280" y2="126" stroke="#171717" strokeWidth="2" />
      </svg>
    </Frame>
  );
}

function ArchitectureAfter3() {
  return (
    <Frame>
      <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
        <path d="M64 132 L96 56 L128 132 Z" fill="none" stroke="#171717" strokeWidth="6" />
        <line x1="80" y1="100" x2="112" y2="100" stroke="#171717" strokeWidth="6" />
        <text
          x="152"
          y="108"
          fontFamily="DM Sans, Helvetica, sans-serif"
          fontSize="26"
          fontWeight="600"
          letterSpacing="3"
          fill="#171717"
        >
          ATELIER
        </text>
      </svg>
    </Frame>
  );
}

function CultureBefore() {
  return (
    <Frame tone="chaos">
      <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="cultureChaos" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>
        <circle cx="96" cy="88" r="48" fill="url(#cultureChaos)" />
        <path d="M76 76 Q96 54 116 76 Q106 92 96 114 Q86 92 76 76 Z" fill="#fff" opacity="0.88" />
        <text x="158" y="82" fontFamily="Georgia, serif" fontSize="24" fill="#7c3aed">
          Museum
        </text>
        <text x="158" y="108" fontFamily="Arial, sans-serif" fontSize="13" fill="#a855f7">
          of Modern Vibes
        </text>
        <rect x="158" y="124" width="96" height="7" rx="3" fill="#fbbf24" />
      </svg>
    </Frame>
  );
}

function CultureAfter1() {
  return (
    <Frame>
      <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
        <rect x="86" y="46" width="52" height="52" fill="#171717" />
        <circle cx="196" cy="72" r="26" fill="#171717" />
        <text
          x="160"
          y="148"
          textAnchor="middle"
          fontFamily="DM Sans, Helvetica, sans-serif"
          fontSize="18"
          fontWeight="600"
          letterSpacing="5"
          fill="#171717"
        >
          FORUM
        </text>
      </svg>
    </Frame>
  );
}

function CultureAfter2() {
  return (
    <Frame>
      <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
        <path
          d="M118 48 H158 L198 150 H154 L147 130 H133 L126 150 H82 Z M134 108 H142 L138 88 Z"
          fill="#171717"
        />
      </svg>
    </Frame>
  );
}

function CultureAfter3() {
  return (
    <Frame>
      <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
        <rect x="132" y="36" width="56" height="96" fill="none" stroke="#171717" strokeWidth="8" />
        <line x1="132" y1="66" x2="188" y2="66" stroke="#171717" strokeWidth="8" />
        <text
          x="160"
          y="168"
          textAnchor="middle"
          fontFamily="DM Sans, Helvetica, sans-serif"
          fontSize="14"
          fontWeight="600"
          letterSpacing="6"
          fill="#171717"
        >
          FORUM
        </text>
      </svg>
    </Frame>
  );
}

const MARKS: Record<
  CaseId,
  {
    before: () => ReactNode;
    after: Array<() => ReactNode>;
  }
> = {
  fintech: {
    before: FintechBefore,
    after: [FintechAfter1, FintechAfter2, FintechAfter3],
  },
  architecture: {
    before: ArchitectureBefore,
    after: [ArchitectureAfter1, ArchitectureAfter2, ArchitectureAfter3],
  },
  culture: {
    before: CultureBefore,
    after: [CultureAfter1, CultureAfter2, CultureAfter3],
  },
};

export type { CaseId };
export { MARKS };

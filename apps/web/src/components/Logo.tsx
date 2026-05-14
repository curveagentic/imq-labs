export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div className="inline-flex items-center gap-2 select-none" style={{ fontSize: size * 0.7, lineHeight: 1 }}>
      <span className="font-black tracking-tighter text-text">IMQ</span>
      <span className="font-black tracking-[0.2em] text-wave-500 text-[0.45em] uppercase">Labs</span>
    </div>
  );
}

export function LogoMark({ size = 64 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
        <defs>
          <linearGradient id="wave" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="#FF3344" />
            <stop offset="100%" stopColor="#A30010" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="60" height="60" rx="14" fill="#11111A" stroke="#2A2A3A" />
        {[14, 22, 30, 38, 46].map((x, i) => {
          const h = [28, 38, 20, 34, 26][i];
          return (
            <rect
              key={x}
              x={x - 2}
              y={32 - h / 2}
              width={4}
              height={h}
              rx={2}
              fill="url(#wave)"
            />
          );
        })}
        <path d="M17 46H47" stroke="#D4A848" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      </svg>
    </div>
  );
}

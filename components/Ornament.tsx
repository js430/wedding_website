// Quiet ornamental divider between sections — thin gold flourish
// curves meeting at a center diamond, like a letterpress rule.

export default function Ornament() {
  return (
    <div className="py-10 flex justify-center" aria-hidden="true">
      <svg viewBox="0 0 420 36" className="w-72 md:w-96 text-gold" fill="none">
        {/* Left flourish */}
        <path d="M10 18 C 80 18, 140 6, 192 18" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1" />
        <path d="M10 18 C 80 18, 140 30, 192 18" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
        {/* Right flourish (mirrored) */}
        <path d="M410 18 C 340 18, 280 6, 228 18" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1" />
        <path d="M410 18 C 340 18, 280 30, 228 18" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
        {/* Center diamond flanked by dots */}
        <rect x="206" y="14" width="8" height="8" transform="rotate(45 210 18)" fill="currentColor" fillOpacity="0.8" />
        <circle cx="196" cy="18" r="1.5" fill="currentColor" fillOpacity="0.6" />
        <circle cx="224" cy="18" r="1.5" fill="currentColor" fillOpacity="0.6" />
      </svg>
    </div>
  );
}

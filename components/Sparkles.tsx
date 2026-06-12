// Twinkling gold sparkles. Deterministic placement so server and
// client render identically.

const SPARKLES = Array.from({ length: 18 }, (_, i) => ({
  top: ((i * 53 + 11) % 90) + 3,
  left: ((i * 37 + 7) % 94) + 2,
  size: 10 + (i % 4) * 4,
  delay: (i * 0.7) % 4.2,
  duration: 2.4 + (i % 3) * 0.9,
}));

export default function Sparkles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {SPARKLES.map((s, i) => (
        <span
          key={i}
          className="absolute text-gold select-none leading-none"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            fontSize: s.size,
            opacity: 0,
            textShadow: "0 0 10px rgba(201, 168, 56, 0.9)",
            animation: `sparkleTwinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        >
          ✦
        </span>
      ))}
    </div>
  );
}

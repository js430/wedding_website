// Gently falling petals in the wedding palette. Pure CSS animation,
// deterministic values so server and client render identically.

const PETALS = Array.from({ length: 14 }, (_, i) => ({
  left:     (i * 7.3 + 2) % 100,           // spread across the width
  delay:    (i * 1.9) % 16,                // staggered starts
  duration: 13 + (i % 5) * 2.5,            // varied fall speeds
  size:     11 + (i % 4) * 4,
  color:
    i % 5 === 0
      ? "rgba(160, 130, 30, 0.7)"          // deep gold
      : i % 3 === 0
      ? "rgba(139, 0, 16, 0.6)"            // burgundy
      : "rgba(204, 20, 40, 0.55)",         // crimson
}));

export default function Petals() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="absolute block"
          style={{
            left: `${p.left}%`,
            top: "-6%",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            opacity: 0,
            borderRadius: "0 50% 50% 50%",
            animation: `petalFall ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

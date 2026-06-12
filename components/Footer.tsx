export default function Footer() {
  return (
    <footer className="py-14 px-6 bg-crimson-darkest text-rose-blush/70 text-center">
      {/* Monogram */}
      <div className="w-16 h-16 mx-auto mb-5 rounded-full border border-gold/40 flex items-center justify-center">
        <span className="font-serif italic text-gold text-base tracking-wide">J·K</span>
      </div>
      <p className="font-serif italic text-2xl text-rose-blush mb-2">
        Jeffrey &amp; Katie
      </p>
      <p className="font-sans text-xs tracking-widest uppercase mb-6">
        March 27, 2027 · Charlottesville, VA
      </p>
      <div className="h-px w-24 mx-auto mb-6 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      <p className="font-sans text-xs text-ivory/40">
        Made with love · {new Date().getFullYear()}
      </p>
    </footer>
  );
}

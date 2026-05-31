export default function Footer() {
  return (
    <footer className="py-12 px-6 bg-crimson-darkest text-rose-blush/70 text-center">
      <p className="font-serif italic text-2xl text-rose-blush mb-2">
        Jeffrey &amp; Katie
      </p>
      <p className="font-sans text-xs tracking-widest uppercase mb-6">
        March 27, 2027 · Charlottesville, VA
      </p>
      <div className="h-px w-12 bg-gold/40 mx-auto mb-6" />
      <p className="font-sans text-xs text-ivory/40">
        Made with love · {new Date().getFullYear()}
      </p>
    </footer>
  );
}

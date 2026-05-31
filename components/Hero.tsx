export default function Hero() {
  return (
    <section
      id="top"
      className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden"
      style={{
        background:
          "linear-gradient(160deg, #FEE8EC 0%, #FFB3C4 40%, #FEE8EC 100%)",
      }}
    >
      {/* Decorative rings */}
      <div className="absolute top-24 left-10 w-40 h-40 rounded-full border border-gold/20 pointer-events-none" />
      <div className="absolute top-16 left-4 w-60 h-60 rounded-full border border-gold/10 pointer-events-none" />
      <div className="absolute bottom-20 right-8 w-48 h-48 rounded-full border border-rose-soft/30 pointer-events-none" />
      <div className="absolute bottom-12 right-2 w-72 h-72 rounded-full border border-rose-soft/15 pointer-events-none" />

      {/* Monogram */}
      <p className="font-serif italic text-gold text-lg mb-4 tracking-widest">
        Together Forever
      </p>

      <h1 className="font-serif text-6xl md:text-8xl text-bark mb-6 leading-none">
        Jeffrey
        <span className="block text-3xl md:text-4xl text-rose-deep my-2 font-serif italic">
          &amp;
        </span>
        Katie
      </h1>

      <div className="flex items-center gap-4 mb-8">
        <span className="block h-px w-12 bg-gold" />
        <p className="font-sans text-sm tracking-[0.3em] uppercase text-bark/60">
          Saturday, March 27, 2027
        </p>
        <span className="block h-px w-12 bg-gold" />
      </div>

      <p className="font-sans text-bark/60 tracking-widest text-xs uppercase mb-10">
        Charlottesville, Virginia
      </p>

      <a href="#rsvp" className="btn-primary">
        RSVP Now
      </a>

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-bark/30">
        <span className="text-xs tracking-widest uppercase font-sans">Scroll</span>
        <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}

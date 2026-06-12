// Slow-scrolling script ribbon. Two identical halves make the
// -50% translate loop seamless.

const PHRASE = "Jeffrey & Katie · March 27, 2027 · Charlottesville, Virginia · ";

export default function Marquee() {
  return (
    <div className="bg-crimson-darkest py-4 overflow-hidden" aria-hidden="true">
      <div className="flex w-max [animation:marqueeScroll_45s_linear_infinite]">
        {[0, 1].map((k) => (
          <span
            key={k}
            className="font-script text-4xl md:text-5xl text-gold/80 whitespace-nowrap pr-8"
          >
            {PHRASE.repeat(3)}
          </span>
        ))}
      </div>
    </div>
  );
}

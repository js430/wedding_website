import Reveal from "./Reveal";
import SparkleTitle from "./SparkleTitle";

const milestones = [
  {
    year: "September 1, 2018",
    title: "How We Met",
    body: "At UVA, the Chinese Student Association and the Greek life worlds of Lambda Phi Epsilon and Alpha Kappa Delta Phi had a way of bringing the same people together. On the first day of September, those overlapping circles put Jeffrey and Katie in the same room — and it only took a few of those moments to realize they were meant to keep finding each other.",
  },
  {
    year: "October 9, 2018",
    title: "Our First Date",
    body: "Five weeks later, they finally made plans that weren't somebody else's. Dinner at Doma — no group chat, no crowded room, no mutual friends to fall back on, just the two of them talking long past the point where either had anywhere else to be.",
  },
  {
    year: "May 2020",
    title: "Katie Graduates",
    body: "Katie finished her time at UVA and left Grounds for the next chapter. The place where they met became a place they visited — but the two of them kept going, now with a year of Charlottesville left between them.",
  },
  {
    year: "May 2021",
    title: "Jeffrey Graduates",
    body: "A year later, Jeffrey walked too, and Charlottesville went from home to history. Everything that came after — the moves, the jobs, the cities — they built somewhere else, carrying the place that started it with them.",
  },
  {
    year: "August 2025",
    title: "The Proposal",
    body: "On an early August morning in Brooklyn, the city was still quiet — just the soft light of dawn breaking over the Lower Manhattan skyline, reflected in the waters of the Hudson. Jeffrey had planned every detail: the early hour, the view, the moment. As Katie took in the skyline, he got down on one knee. With the greatest backdrop New York had to offer and every word from his heart, he asked the question he'd been waiting to ask. She said yes before he could finish.",
  },
  {
    year: "March 2027",
    title: "The Wedding",
    body: "Almost six years after they last called it home, Jeffrey and Katie are coming back to Charlottesville. They'll say their vows a short walk from where two sets of friends first overlapped — ending where they began, and beginning again.",
  },
];

export default function OurStory() {
  return (
    <section id="story" className="py-24 px-6 bg-rose-blush">
      <div className="max-w-3xl mx-auto">
        <Reveal>
          <SparkleTitle text="Our Story" />
          <div className="section-divider">
            <span className="text-gold text-xl">✦</span>
          </div>
        </Reveal>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-rose-soft/40 hidden md:block" />

          <ol className="space-y-12">
            {milestones.map((m, i) => (
              <li key={i} className="md:pl-20 relative group">
                {/* Dot — outside Reveal so the entrance transform doesn't shift it */}
                <div className="hidden md:flex absolute left-5 top-1 w-6 h-6 rounded-full border-2 border-rose-deep bg-ivory items-center justify-center transition-transform duration-300 group-hover:scale-125">
                  <div className="w-2 h-2 rounded-full bg-rose-deep" />
                </div>

                <Reveal delay={i * 150}>
                  <span className="font-serif italic text-gold text-sm">{m.year}</span>
                  <h3 className="font-serif text-2xl text-bark mt-1 mb-2">{m.title}</h3>
                  <p className="font-sans text-bark/70 leading-relaxed">{m.body}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

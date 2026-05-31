const milestones = [
  {
    year: "October 2018",
    title: "How We Met",
    body: "At UVA, the Chinese Student Association and the Greek life worlds of Lambda Phi Epsilon and Alpha Kappa Delta Phi had a way of bringing the same people together. For Jeffrey and Katie, it only took a few of those moments to realize they were meant to keep finding each other.",
  },
  {
    year: "August 2025",
    title: "The Proposal",
    body: "On an early August morning in Brooklyn, the city was still quiet — just the soft light of dawn breaking over the Lower Manhattan skyline, reflected in the waters of the Hudson. Jeffrey had planned every detail: the early hour, the view, the moment. As Katie took in the skyline, he got down on one knee. With the greatest backdrop New York had to offer and every word from his heart, he asked the question he'd been waiting to ask. She said yes before he could finish.",
  },
  {
    year: "March 2027",
    title: "The Wedding",
    body: "Back at the University of Virginia, where two paths first crossed, Jeffrey and Katie will celebrate the life they've built together. The place that brought them together will be the place they begin forever.",
  },
];

export default function OurStory() {
  return (
    <section id="story" className="py-24 px-6 bg-rose-blush">
      <div className="max-w-3xl mx-auto">
        <h2 className="section-title">Our Story</h2>
        <div className="section-divider">
          <span className="text-gold text-xl">✦</span>
        </div>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-rose-soft/40 hidden md:block" />

          <ol className="space-y-12">
            {milestones.map((m, i) => (
              <li key={i} className="md:pl-20 relative">
                {/* Dot */}
                <div className="hidden md:flex absolute left-5 top-1 w-6 h-6 rounded-full border-2 border-rose-deep bg-ivory items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-rose-deep" />
                </div>

                <span className="font-serif italic text-gold text-sm">{m.year}</span>
                <h3 className="font-serif text-2xl text-bark mt-1 mb-2">{m.title}</h3>
                <p className="font-sans text-bark/70 leading-relaxed">{m.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

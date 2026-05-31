const milestones = [
  {
    year: "2019",
    title: "How We Met",
    body: "A chance encounter at a mutual friend's dinner party led to an evening of laughter, great conversation, and an undeniable spark neither of us could ignore.",
  },
  {
    year: "2021",
    title: "First Adventure Together",
    body: "A spontaneous road trip through the Blue Ridge Mountains — the weekend we both knew this was something truly special.",
  },
  {
    year: "2024",
    title: "The Proposal",
    body: "Under the stars at Cheekwood Gardens, Jeffrey got down on one knee and asked the question that would change everything. Katie said yes before he could finish the sentence.",
  },
  {
    year: "2027",
    title: "The Wedding",
    body: "Surrounded by the people we love most, we begin the greatest adventure of our lives.",
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

import Image from "next/image";
import Reveal from "./Reveal";

const photos = [
  {
    src: "/photo-walking.jpg",
    alt: "Jeffrey and Katie walking together",
    caption: "Where we wander",
  },
  {
    src: "/photo-proposal.jpg",
    alt: "The proposal — Brooklyn Bridge",
    caption: "The question — Brooklyn, NY",
  },
];

export default function Gallery() {
  return (
    <section id="gallery" className="py-24 px-6 bg-rose-soft/20">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <h2 className="section-title">Gallery</h2>
          <div className="section-divider">
            <span className="text-gold text-xl">✦</span>
          </div>
        </Reveal>

        {photos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {photos.map((p, i) => (
              <Reveal key={i} delay={i * 120}>
                <div className="aspect-square overflow-hidden relative group">
                  <Image
                    src={p.src}
                    alt={p.alt}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                  {/* Caption overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-crimson-darkest/70 to-transparent pt-10 pb-3 px-4 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    <p className="font-serif italic text-rose-blush text-sm">{p.caption}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="text-center font-sans text-bark/60 text-sm">
            Photos coming soon.
          </p>
        )}
      </div>
    </section>
  );
}

import Image from "next/image";

const photos = [
  {
    src: "/photo-walking.jpg",
    alt: "Jeffrey and Katie walking together",
  },
  {
    src: "/photo-proposal.jpg",
    alt: "The proposal — Brooklyn Bridge",
  },
];

export default function Gallery() {
  return (
    <section id="gallery" className="py-24 px-6 bg-rose-soft/20">
      <div className="max-w-5xl mx-auto">
        <h2 className="section-title">Gallery</h2>
        <div className="section-divider">
          <span className="text-gold text-xl">✦</span>
        </div>

        {photos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {photos.map((p, i) => (
              <div key={i} className="aspect-square overflow-hidden relative">
                <Image
                  src={p.src}
                  alt={p.alt}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
              </div>
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

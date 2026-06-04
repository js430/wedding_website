const photos = [
  { alt: "Engagement photo 1", bg: "#f9e8e8" },
  { alt: "Engagement photo 2", bg: "#fdf3e3" },
  { alt: "Engagement photo 3", bg: "#e5989b33" },
  { alt: "Engagement photo 4", bg: "#c9a96e22" },
  { alt: "Engagement photo 5", bg: "#f9e8e8" },
  { alt: "Engagement photo 6", bg: "#fdf3e3" },
];

export default function Gallery() {
  return (
    <section id="gallery" className="py-24 px-6 bg-rose-soft/20">
      <div className="max-w-5xl mx-auto">
        <h2 className="section-title">Gallery</h2>
        <div className="section-divider">
          <span className="text-gold text-xl">✦</span>
        </div>

        <p className="text-center font-sans text-bark/60 text-sm mb-10 -mt-4">
          Photos coming soon.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {photos.map((p, i) => (
            <div
              key={i}
              className="aspect-square overflow-hidden"
              style={{ backgroundColor: p.bg }}
            >
              {/* Replace this div with an <Image> once you have photos */}
              <div className="w-full h-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-bark/20"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

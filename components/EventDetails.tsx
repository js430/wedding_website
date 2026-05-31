const events = [
  {
    type: "Ceremony",
    icon: "💍",
    time: "4:00 PM",
    venue: "The Barn at Sycamore Farms",
    address: "4235 Arno Road, Franklin, TN 37064",
    notes: "Doors open at 3:30 PM. The ceremony will be held outdoors — we recommend flat shoes for the grass.",
    mapUrl: "https://maps.google.com/?q=4235+Arno+Road+Franklin+TN",
  },
  {
    type: "Reception",
    icon: "🥂",
    time: "6:00 PM",
    venue: "The Barn at Sycamore Farms",
    address: "4235 Arno Road, Franklin, TN 37064",
    notes: "Dinner, dancing, and celebrating until midnight. Black tie optional.",
    mapUrl: "https://maps.google.com/?q=4235+Arno+Road+Franklin+TN",
  },
];

export default function EventDetails() {
  return (
    <section
      id="details"
      className="py-24 px-6"
      style={{
        background:
          "linear-gradient(180deg, #fff8f0 0%, #f9e8e8 50%, #fff8f0 100%)",
      }}
    >
      <div className="max-w-4xl mx-auto">
        <h2 className="section-title">Wedding Details</h2>
        <div className="section-divider">
          <span className="text-gold text-xl">✦</span>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {events.map((e) => (
            <div
              key={e.type}
              className="bg-ivory/80 backdrop-blur border border-rose-soft/30 p-8 text-center"
            >
              <div className="text-4xl mb-4">{e.icon}</div>
              <h3 className="font-serif text-2xl text-bark mb-1">{e.type}</h3>
              <p className="font-sans text-rose-deep text-sm tracking-widest uppercase mb-5">
                September 27, 2025 · {e.time}
              </p>
              <div className="h-px bg-gold/40 mb-5" />
              <p className="font-serif text-lg text-bark mb-1">{e.venue}</p>
              <p className="font-sans text-bark/60 text-sm mb-5">{e.address}</p>
              <p className="font-sans text-bark/70 text-sm leading-relaxed mb-6">
                {e.notes}
              </p>
              <a
                href={e.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline inline-block"
              >
                View Map
              </a>
            </div>
          ))}
        </div>

        {/* Dress code & hotel */}
        <div className="mt-12 grid md:grid-cols-2 gap-6 text-center">
          <div className="p-6 border border-gold/30 bg-ivory/50">
            <p className="font-serif italic text-gold text-sm mb-2">Dress Code</p>
            <p className="font-serif text-xl text-bark mb-2">Black Tie Optional</p>
            <p className="font-sans text-bark/60 text-sm">
              Formal attire encouraged. Please avoid white.
            </p>
          </div>
          <div className="p-6 border border-gold/30 bg-ivory/50">
            <p className="font-serif italic text-gold text-sm mb-2">Hotel Block</p>
            <p className="font-serif text-xl text-bark mb-2">Marriott Cool Springs</p>
            <p className="font-sans text-bark/60 text-sm">
              Use code <strong>JEFFAMY25</strong> for a discounted rate until Aug 27.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const events = [
  {
    type: "Ceremony",
    icon: "💍",
    time: "4:00 PM",
    venue: "The Forum Hotel",
    address: "540 Massie Rd, Charlottesville, VA 22903",
    notes: "Doors open at 3:30 PM. The ceremony will be held outdoors — we recommend flat shoes for the grass.",
    mapUrl: "https://maps.google.com/?q=540+Massie+Rd+Charlottesville+VA+22903",
  },
  {
    type: "Reception",
    icon: "🥂",
    time: "6:00 PM",
    venue: "The Forum Hotel",
    address: "540 Massie Rd, Charlottesville, VA 22903",
    notes: "Dinner, dancing, and celebrating until midnight. Black tie optional.",
    mapUrl: "https://maps.google.com/?q=540+Massie+Rd+Charlottesville+VA+22903",
  },
  {
    type: "After Party",
    icon: "🎉",
    time: "12:00 AM or later",
    venue: "The Corner",
    address: "University Ave, Charlottesville, VA",
    notes: "The night isn't over — join us at The Corner, right in the heart of UVA, where it all began.",
    mapUrl: "https://maps.google.com/?q=The+Corner+University+Ave+Charlottesville+VA",
  },
];

export default function EventDetails() {
  return (
    <section
      id="details"
      className="py-24 px-6"
      style={{
        background:
          "linear-gradient(180deg, #FEE8EC 0%, #FFB3C4 50%, #FEE8EC 100%)",
      }}
    >
      <div className="max-w-4xl mx-auto">
        <h2 className="section-title">Wedding Details</h2>
        <div className="section-divider">
          <span className="text-gold text-xl">✦</span>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {events.map((e) => (
            <div
              key={e.type}
              className="bg-ivory/80 backdrop-blur border border-rose-soft/30 p-8 text-center"
            >
              <div className="text-4xl mb-4">{e.icon}</div>
              <h3 className="font-serif text-2xl text-bark mb-1">{e.type}</h3>
              <p className="font-sans text-rose-deep text-sm tracking-widest uppercase mb-5">
                March 27, 2027 · {e.time}
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
            <p className="font-serif text-xl text-bark mb-2">Business Formal</p>
            <p className="font-sans text-bark/60 text-sm mb-4">
              Please avoid white. We encourage guests to embrace our wedding palette:
            </p>
            <div className="bg-white rounded p-3 flex justify-center gap-3 mt-3">
              {[
                { color: "#FEE8EC", label: "Blush" },
                { color: "#FFB3C4", label: "Pink" },
                { color: "#CC1428", label: "Crimson" },
                { color: "#8B0010", label: "Burgundy" },
                { color: "#1E0008", label: "Maroon" },
              ].map(({ color, label }) => (
                <div key={color} className="flex flex-col items-center gap-1">
                  <div
                    className="w-10 h-10 border border-gray-200"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-sans text-gray-500 text-xs">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-6 border border-gold/30 bg-ivory/50">
            <p className="font-serif italic text-gold text-sm mb-2">Hotel Block</p>
            <p className="font-serif text-xl text-bark mb-2">The Forum Hotel</p>
            <p className="font-sans text-bark/60 text-sm">
              Use code <strong>JEFFKATIE27</strong> for a discounted rate. Block expires Feb 27.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

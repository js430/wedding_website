import Navbar from "./Navbar";
import Footer from "./Footer";
import Reveal from "./Reveal";
import SparkleTitle from "./SparkleTitle";

/* ── Content ──────────────────────────────────────────────────────────────
   Edit freely — every card is a row in these arrays. */

const mapUrl = (q: string) =>
  `https://maps.google.com/?q=${encodeURIComponent(q + " Charlottesville VA")}`;

const hotels = [
  {
    name: "Graduate Charlottesville",
    price: "$$",
    distance: "1.5 mi",
    near: "On the Corner",
    blurb:
      "Right on the Corner with rooftop views toward the Rotunda; collegiate-chic rooms.",
  },
  {
    name: "Courtyard by Marriott (West Main)",
    price: "$$",
    distance: "1.3 mi",
    near: "Near the Corner",
    blurb: "Modern Marriott on West Main, a short walk from the Corner and UVA.",
  },
  {
    name: "The Draftsman",
    price: "$$",
    distance: "1.8 mi",
    near: "Near UVA",
    blurb: "Modern Autograph Collection hotel between UVA and the hospital district.",
  },
  {
    name: "Oakhurst Inn",
    price: "$$",
    distance: "1.7 mi",
    near: "Near UVA",
    blurb: "Cozy boutique inn in restored 1920s houses right beside UVA.",
  },
  {
    name: "Hampton Inn & Suites at the University",
    price: "$",
    distance: "1.4 mi",
    near: "Near Grounds",
    blurb: "Reliable and budget-friendly — the closest option to North Grounds.",
  },
  {
    name: "Boar's Head Resort",
    price: "$$$",
    distance: "3.5 mi",
    near: null,
    blurb:
      "UVA's own resort — golf, spa, and pastoral grounds about ten minutes from the venue.",
  },
  {
    name: "Omni Charlottesville",
    price: "$$",
    distance: "3 mi",
    near: null,
    blurb: "Anchors the Downtown Mall — steps from restaurants, shops, and nightlife.",
  },
  {
    name: "Quirk Hotel",
    price: "$$$",
    distance: "3 mi",
    near: null,
    blurb: "Art-filled boutique hotel with a rooftop bar, a short walk to the Downtown Mall.",
  },
];

const restaurants = [
  {
    group: "Charlottesville Classics",
    items: [
      {
        name: "Bodo's Bagels",
        tag: "Bagels · $",
        blurb: "The UVA institution. Go early, order the everything bagel, thank us later.",
      },
      {
        name: "The Virginian",
        tag: "American · $$",
        blurb: "Virginia's oldest restaurant, serving the Corner since 1923.",
      },
      {
        name: "Marco & Luca",
        tag: "Dumplings · $",
        blurb: "Legendary Corner dumplings — a late-night rite of passage.",
      },
      {
        name: "Ace Biscuit & Barbecue",
        tag: "Southern · $",
        blurb: "Biscuits worth the line. Get the Rooster.",
      },
    ],
  },
  {
    group: "Date-Night Dinner",
    items: [
      {
        name: "Mas Tapas",
        tag: "Spanish · $$$",
        blurb: "Belmont tapas institution — patatas bravas and anything off the wood grill.",
      },
      {
        name: "Tavola",
        tag: "Italian · $$$",
        blurb: "Intimate Belmont Italian with a serious wine list.",
      },
      {
        name: "C&O Restaurant",
        tag: "French-inspired · $$$",
        blurb: "Candlelit dining in a former railroad building — a special-occasion classic.",
      },
      {
        name: "Oakhart Social",
        tag: "Small plates · $$$",
        blurb: "Wood-fired small plates and excellent cocktails on West Main.",
      },
      {
        name: "The Local",
        tag: "Farm-to-table · $$",
        blurb: "Belmont staple sourcing from the surrounding countryside.",
      },
    ],
  },
  {
    group: "Casual Dinner",
    items: [
      {
        name: "Doma Korean Kitchen",
        tag: "Korean · $$",
        blurb: "Casual Korean comfort food — bibimbap, bulgogi, and Korean fried chicken.",
      },
      {
        name: "Now & Zen",
        tag: "Sushi · $$",
        blurb: "Sushi and Japanese small plates in the Main Street Market.",
      },
      {
        name: "Smyrna",
        tag: "Mediterranean · $$",
        blurb: "Mediterranean mezze, kebabs, and fresh-baked pita.",
      },
    ],
  },
  {
    group: "Coffee & Casual",
    items: [
      {
        name: "Grit Coffee",
        tag: "Coffee · $",
        blurb: "Local roaster with several locations, including the Corner.",
      },
      {
        name: "Mudhouse",
        tag: "Coffee · $",
        blurb: "The Downtown Mall's coffee mainstay since 1993.",
      },
      {
        name: "Citizen Burger Bar",
        tag: "Burgers · $$",
        blurb: "Corner burgers built on local beef and Virginia beer.",
      },
    ],
  },
];

const attractions = [
  {
    name: "The Lawn & Rotunda",
    tag: "UVA · Free",
    blurb:
      "Jefferson's Academical Village and a UNESCO World Heritage Site — and where our story began.",
  },
  {
    name: "Monticello",
    tag: "History · ~20 min",
    blurb: "Thomas Jefferson's mountaintop home. Book tour tickets ahead.",
  },
  {
    name: "Downtown Mall",
    tag: "Shops & food",
    blurb: "Eight brick-paved pedestrian blocks of restaurants, shops, and buskers.",
  },
  {
    name: "Carter Mountain Orchard",
    tag: "Views · Seasonal",
    blurb: "Cider slushies and sweeping Blue Ridge views above the city.",
  },
  {
    name: "King Family Vineyards",
    tag: "Winery · ~25 min",
    blurb: "Crozet views and polo on summer Sundays.",
  },
  {
    name: "Pippin Hill Farm & Vineyards",
    tag: "Winery · ~25 min",
    blurb: "The wine-country postcard — rosé with a view.",
  },
  {
    name: "Humpback Rocks",
    tag: "Hike · ~30 min",
    blurb: "Short, steep climb to the best sunrise view on the Blue Ridge Parkway.",
  },
  {
    name: "IX Art Park",
    tag: "Art · Free",
    blurb: "Ever-changing outdoor art park just off the Downtown Mall.",
  },
];

const gettingAround = [
  {
    icon: "✈️",
    title: "Flying In",
    body: "Charlottesville Albemarle (CHO) is 10 minutes away. Richmond (RIC) is ~1¼ hours; Dulles (IAD) ~2 hours.",
  },
  {
    icon: "🚗",
    title: "Driving & Parking",
    body: "Complimentary parking at The Forum Hotel. A car is handy for wineries and hikes.",
  },
  {
    icon: "📱",
    title: "Rideshare",
    body: "Uber and Lyft are plentiful around UVA and Downtown — a few minutes' wait most evenings.",
  },
  {
    icon: "🚋",
    title: "Free Trolley",
    body: "The free trolley runs between the Corner and the Downtown Mall every 15 minutes.",
  },
  {
    icon: "🚌",
    title: "UVA Bus (UTS)",
    body: "University Transit Service routes mainly serve students and staff, but they're free and handy for getting around Grounds. Track live arrivals in the TransLoc app.",
  },
];

/* ── Building blocks ────────────────────────────────────────────────────── */

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Reveal>
      <h3 className="font-serif text-3xl text-bark text-center mb-2">{title}</h3>
      <div className="flex items-center justify-center gap-3 mb-3">
        <span className="block h-px w-10 bg-gradient-to-r from-transparent to-gold" />
        <span className="text-gold text-sm">✦</span>
        <span className="block h-px w-10 bg-gradient-to-l from-transparent to-gold" />
      </div>
      {subtitle && (
        <p className="text-center font-sans text-bark/60 text-sm mb-8 max-w-xl mx-auto">
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}

function PlaceCard({
  name,
  meta,
  blurb,
  delay = 0,
  highlight,
}: {
  name: string;
  meta: string;
  blurb: string;
  delay?: number;
  highlight?: string | null;
}) {
  return (
    <Reveal delay={delay} className="h-full">
      <div
        className={`lift h-full bg-white/70 border p-5 flex flex-col ${
          highlight ? "border-gold/60" : "border-rose-soft/30 hover:border-rose-soft/60"
        }`}
      >
        {highlight && (
          <span className="mb-2 w-fit font-sans text-[10px] tracking-widest uppercase text-gold border border-gold/50 px-2 py-0.5">
            ✦ {highlight}
          </span>
        )}
        <div className="flex items-start justify-between gap-3 mb-1">
          <p className="font-serif text-lg text-bark leading-snug">{name}</p>
          <span className="shrink-0 font-sans text-[10px] tracking-widest uppercase text-rose-deep border border-rose-soft/50 px-2 py-0.5 whitespace-nowrap">
            {meta}
          </span>
        </div>
        <p className="font-sans text-bark/70 text-sm leading-relaxed flex-1">{blurb}</p>
        <a
          href={mapUrl(name)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 font-sans text-xs tracking-widest uppercase text-bark/50 hover:text-rose-deep transition-colors w-fit"
        >
          Map ↗
        </a>
      </div>
    </Reveal>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

const jumpLinks = [
  { label: "Stay", href: "#stay" },
  { label: "Eat & Drink", href: "#eat" },
  { label: "See & Do", href: "#do" },
  { label: "Getting Around", href: "#around" },
];

export default function GuidePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-rose-blush pt-24 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <SparkleTitle text="Charlottesville Guide" className="mt-8" />
          <div className="section-divider">
            <span className="text-gold text-xl">✦</span>
          </div>
          <p className="text-center font-sans text-bark/60 text-sm mb-8 -mt-4 max-w-xl mx-auto">
            Our favorite corners of the town where it all began — where to
            stay, eat, and wander while you&apos;re here for the weekend.
          </p>

          {/* Jump pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-16">
            {jumpLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="font-sans text-xs tracking-widest uppercase px-4 py-2 border border-rose-soft/50 text-bark/60 hover:border-rose-deep hover:text-rose-deep transition-all"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Stay */}
          <section id="stay" className="scroll-mt-24 mb-20">
            <SectionHeader
              title="Where to Stay"
              subtitle="The room block at The Forum Hotel (via the RSVP page) is the easiest option. If you'd like something else, those marked ✦ are near UVA or the Corner — easy to reach, with a quick ride to the venue."
            />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {hotels.map((h, i) => (
                <PlaceCard
                  key={h.name}
                  name={h.name}
                  meta={`${h.price} · ${h.distance}`}
                  blurb={h.blurb}
                  highlight={h.near}
                  delay={(i % 3) * 100}
                />
              ))}
            </div>
          </section>

          {/* Eat & Drink */}
          <section id="eat" className="scroll-mt-24 mb-20">
            <SectionHeader
              title="Eat & Drink"
              subtitle="Charlottesville eats far above its weight. A few of our favorites, from Corner institutions to date-night rooms."
            />
            {restaurants.map((group) => (
              <div key={group.group} className="mb-10 last:mb-0">
                <Reveal>
                  <p className="font-sans text-xs tracking-[0.25em] uppercase text-rose-deep mb-4 text-center">
                    {group.group}
                  </p>
                </Reveal>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {group.items.map((r, i) => (
                    <PlaceCard
                      key={r.name}
                      name={r.name}
                      meta={r.tag}
                      blurb={r.blurb}
                      delay={(i % 3) * 100}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* See & Do */}
          <section id="do" className="scroll-mt-24 mb-20">
            <SectionHeader
              title="See & Do"
              subtitle="Blue Ridge views, Jefferson's mountain, and the Grounds where we met."
            />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {attractions.map((a, i) => (
                <PlaceCard
                  key={a.name}
                  name={a.name}
                  meta={a.tag}
                  blurb={a.blurb}
                  delay={(i % 3) * 100}
                />
              ))}
            </div>
          </section>

          {/* Getting Around */}
          <section id="around" className="scroll-mt-24">
            <SectionHeader title="Getting Around" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {gettingAround.map((g, i) => (
                <Reveal key={g.title} delay={i * 100} className="h-full">
                  <div className="h-full bg-white/50 border border-gold/30 p-5 text-center">
                    <div className="text-2xl mb-2">{g.icon}</div>
                    <p className="font-serif text-lg text-bark mb-2">{g.title}</p>
                    <p className="font-sans text-bark/70 text-sm leading-relaxed">
                      {g.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

"use client";

import { useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

const faqs = [
  {
    category: "RSVP",
    questions: [
      {
        q: "When is the RSVP deadline?",
        a: "Please RSVP by February 27, 2027. If we don't hear from you by then, we'll assume you're unable to attend.",
      },
      {
        q: "Can I bring a plus one?",
        a: "Every invitation includes a +1 — you'll see the option on the RSVP form. If you'd like to bring additional guests beyond your +1, please reach out to Katie and/or Jeffrey directly first.",
      },
      {
        q: "Can I change my RSVP after submitting?",
        a: "Yes — just reach out to us directly and we'll update it for you.",
      },
    ],
  },
  {
    category: "The Day",
    questions: [
      {
        q: "What time should I arrive?",
        a: "Doors open at 4:00 PM. The ceremony begins promptly at 5:00 PM — we recommend arriving by 4:30 PM to find your seat.",
      },
      {
        q: "Will the ceremony be indoors or outdoors?",
        a: "The ceremony will be held outdoors. We recommend flat or block-heeled shoes for the grass. In the event of rain, we have a beautiful indoor backup plan.",
      },
      {
        q: "What is the schedule for the evening?",
        a: "4:00 PM — Doors open\n5:00 PM — Ceremony\nFollowing the ceremony — Cocktail hour on the outdoor patio\n7:00 PM — Reception (dinner & dancing)\n12:00 AM — After party at The Corner (optional)",
      },
      {
        q: "Is the wedding adults only?",
        a: "We love your little ones, but our celebration is adults only. We hope this gives you a chance to enjoy a night out!",
      },
    ],
  },
  {
    category: "Venue & Travel",
    questions: [
      {
        q: "Where is the wedding?",
        a: "The Forum Hotel, 540 Massie Rd, Charlottesville, VA 22903.",
      },
      {
        q: "Is there parking at the venue?",
        a: "Yes, complimentary parking is available at The Forum Hotel.",
      },
      {
        q: "What is the nearest airport?",
        a: "Charlottesville Albemarle Airport (CHO) is the closest, about 10 minutes away. Richmond International (RIC) and Washington Dulles (IAD) are also within driving distance.",
      },
      {
        q: "Is there a hotel room block?",
        a: "Yes! We have a room block at The Forum Hotel (the venue). To reserve a room, use the hotel block form in the RSVP section of this site. The block expires February 27, 2027.",
      },
    ],
  },
  {
    category: "Dress Code",
    questions: [
      {
        q: "What is the dress code?",
        a: "Business Formal. We encourage guests to embrace our wedding colors — blush, pink, crimson, burgundy, and deep maroon. Please avoid white.",
      },
      {
        q: "Can I wear heels?",
        a: "The ceremony is on grass, so we recommend block heels, wedges, or flats. The reception is indoors.",
      },
    ],
  },
  {
    category: "Registry & Gifts",
    questions: [
      {
        q: "Where are you registered?",
        a: "Our registry is right here on this site! Visit the Registry page to browse items and have purchase links sent directly to your email.",
      },
      {
        q: "Do you have a cash fund option?",
        a: "We appreciate the thought — please reach out to us directly if you'd like to contribute to our honeymoon fund.",
      },
    ],
  },
  {
    category: "Other",
    questions: [
      {
        q: "Can I take photos during the ceremony?",
        a: "We ask that you be fully present during the ceremony — please keep phones and cameras put away. Our photographer will capture every moment. Feel free to snap away at the reception!",
      },
      {
        q: "Will there be a shuttle or transportation?",
        a: "No shuttle is needed — The Forum Hotel is the venue itself, so you're already there! If you're staying off-site, Uber and Lyft are readily available in Charlottesville.",
      },
      {
        q: "I have a question not answered here — who do I contact?",
        a: "Feel free to reach out to either of us:\n\nJeffrey Shi — (757) 634-4911 or jeffreyshi430@gmail.com\nKatie Shen — (571) 208-4478 or katie.shen2016@gmail.com",
      },
    ],
  },
];

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-rose-soft/30 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left py-4 flex items-center justify-between gap-4 group"
      >
        <span className="font-serif text-bark text-lg group-hover:text-rose-deep transition-colors">
          {q}
        </span>
        <span className={`shrink-0 text-gold transition-transform duration-200 ${open ? "rotate-45" : ""}`}>
          ✦
        </span>
      </button>
      {open && (
        <div className="pb-4 pr-8">
          {a.split("\n").map((line, i) => (
            <p key={i} className="font-sans text-bark/70 text-sm leading-relaxed">
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-rose-blush pt-24 pb-20 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="section-title mt-8">FAQ</h2>
          <div className="section-divider">
            <span className="text-gold text-xl">✦</span>
          </div>
          <p className="text-center font-sans text-bark/60 text-sm mb-12 -mt-4">
            Everything you need to know about our big day.
          </p>

          <div className="space-y-10">
            {faqs.map((section) => (
              <div key={section.category}>
                <h3 className="font-sans text-xs tracking-widest uppercase text-rose-deep mb-3">
                  {section.category}
                </h3>
                <div className="bg-white/60 border border-rose-soft/30 px-6">
                  {section.questions.map((item) => (
                    <AccordionItem key={item.q} q={item.q} a={item.a} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

/**
 * Room block.
 *
 * Reservations are handled by the hotel's Passkey booking site, so this
 * section points guests there rather than collecting their details for us
 * to re-key by hand.
 */

export const HOTEL_BOOKING_URL =
  "https://book.passkey.com/event/51253740/owner/51120499/home?utm_campaign=301461959";

/** The hotel's own site — rooms, amenities, directions. */
export const HOTEL_WEBSITE_URL = "https://www.forumhotelcharlottesville.com/";

/** Last day to book inside the block — mirrored in the FAQ. */
export const HOTEL_BLOCK_DEADLINE = "February 27, 2027";

export default function HotelBlock() {
  return (
    <div className="text-center">
      {/* The RSVP section already renders the "Hotel Block" heading above this. */}
      <p className="font-serif text-xl text-bark mb-1">
        <a
          href={HOTEL_WEBSITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-rose-deep transition-colors underline decoration-rose-soft/50 underline-offset-4"
        >
          The Forum Hotel
        </a>
      </p>
      <p className="font-sans text-bark/60 text-sm mb-1">
        540 Massie Rd, Charlottesville, VA 22903
      </p>
      <p className="font-sans text-bark/50 text-xs mb-5">
        Approx. <strong className="text-bark/70">$270</strong> + taxes &amp; fees per room
      </p>

      <p className="font-sans text-bark/60 text-sm leading-relaxed mb-6 max-w-sm mx-auto">
        We&apos;ve reserved a block of rooms at the venue. Book, change or cancel
        your stay directly with the hotel — you&apos;ll get a confirmation from
        them straight away.
      </p>

      <a
        href={HOTEL_BOOKING_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary inline-block"
      >
        Book a Room ↗
      </a>

      <p className="mt-4">
        <a
          href={HOTEL_WEBSITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-sans text-xs tracking-widest uppercase text-bark/50 hover:text-rose-deep transition-colors"
        >
          Hotel website ↗
        </a>
      </p>

      <p className="font-sans text-bark/50 text-xs mt-5 leading-relaxed">
        There&apos;s a room for every guest — just book by{" "}
        <strong className="text-bark/70">{HOTEL_BLOCK_DEADLINE}</strong> to get
        our block rate.
      </p>
    </div>
  );
}

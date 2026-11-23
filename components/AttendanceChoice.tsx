"use client";

type YesNo = "yes" | "no" | "";

type Choice = "solo" | "guest" | "no";

/**
 * "Will you attend?" with the +1 folded into the answer: two ways to accept
 * (just me / with a +1) side by side, and decline below. Guests see the +1
 * from the start and answer both questions with one tap.
 */
export default function AttendanceChoice({
  attending,
  plusOne,
  onChange,
  disabled = false,
  legend,
}: {
  attending: YesNo;
  plusOne: YesNo;
  /** Called with the new answers; `plusOne` is "no" when declining. */
  onChange: (attending: "yes" | "no", plusOne: "yes" | "no") => void;
  disabled?: boolean;
  legend: string;
}) {
  const selected: Choice | "" =
    attending === "no" ? "no" : attending === "yes" ? (plusOne === "yes" ? "guest" : "solo") : "";

  const options: { id: Choice; label: string; detail: string; wide?: boolean }[] = [
    { id: "solo",  label: "Joyfully accepts",     detail: "Just me" },
    { id: "guest", label: "Joyfully accepts",     detail: "With a +1" },
    { id: "no",    label: "Regretfully declines", detail: "Can't make it", wide: true },
  ];

  function pick(id: Choice) {
    if (id === "solo") onChange("yes", "no");
    else if (id === "guest") onChange("yes", "yes");
    else onChange("no", "no");
  }

  return (
    <fieldset>
      <legend className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-3">
        {legend}
      </legend>
      <div role="radiogroup" aria-label={legend} className="grid grid-cols-2 gap-3">
        {options.map((opt) => {
          const on = selected === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={disabled}
              onClick={() => pick(opt.id)}
              className={`${opt.wide ? "col-span-2" : ""} px-3 py-3 border text-center transition-all disabled:opacity-50 disabled:cursor-default ${
                on
                  ? "bg-rose-deep text-ivory border-rose-deep"
                  : "border-rose-soft/60 text-bark/70 hover:border-rose-deep hover:text-rose-deep"
              }`}
            >
              <span className="block font-serif text-base leading-snug">{opt.label}</span>
              <span
                className={`block mt-0.5 font-sans text-[11px] tracking-widest uppercase ${
                  on ? "text-ivory/80" : "text-bark/50"
                }`}
              >
                {opt.detail}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

"use client";

import { MAIN_MEALS, SPECIAL_MEALS } from "@/lib/meals";

interface Props {
  legend:   string;
  value:    string;
  onChange: (id: string) => void;
  disabled?: boolean;
  idPrefix: string;
}

const SELECTED   = "bg-rose-deep text-white border-rose-deep";
const UNSELECTED = "border-rose-soft/60 text-bark/60 hover:border-rose-deep hover:text-rose-deep";

export default function MealPicker({ legend, value, onChange, disabled, idPrefix }: Props) {
  return (
    <fieldset className="min-w-0 border-0 p-0 m-0">
      <legend className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-3 p-0">
        {legend}
      </legend>

      <div
        role="radiogroup"
        aria-label={legend}
        className="space-y-2"
      >
        {MAIN_MEALS.map((m) => {
          const selected = value === m.id;
          return (
            <button
              key={m.id}
              id={`${idPrefix}-${m.id}`}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(m.id)}
              className={`block w-full text-left px-4 py-3 border font-sans transition-all disabled:opacity-50 ${
                selected ? SELECTED : UNSELECTED
              }`}
            >
              <span className="block text-sm">{m.label}</span>
              {m.note && (
                <span className={`block text-xs mt-0.5 ${selected ? "text-white/80" : "text-bark/60"}`}>
                  {m.note}
                </span>
              )}
            </button>
          );
        })}

        <p
          id={`${idPrefix}-special-heading`}
          className="font-sans text-xs tracking-widest uppercase text-bark/60 pt-3"
        >
          Special meals
        </p>

        <div className="flex flex-wrap gap-2">
          {SPECIAL_MEALS.map((m) => {
            const selected = value === m.id;
            return (
              <button
                key={m.id}
                id={`${idPrefix}-${m.id}`}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled}
                onClick={() => onChange(m.id)}
                className={`px-3 py-2 border font-sans text-xs transition-all disabled:opacity-50 ${
                  selected ? SELECTED : UNSELECTED
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
    </fieldset>
  );
}

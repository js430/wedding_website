"use client";

import { useState, useEffect } from "react";

const WEDDING = new Date("2027-03-27T17:00:00");

function calcTimeLeft() {
  const diff = WEDDING.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours:   Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function CountdownTimer() {
  const [time, setTime] = useState(calcTimeLeft());

  useEffect(() => {
    const id = setInterval(() => setTime(calcTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;

  const units = [
    { label: "Days",    value: time.days },
    { label: "Hours",   value: time.hours },
    { label: "Minutes", value: time.minutes },
    { label: "Seconds", value: time.seconds },
  ];

  return (
    <div className="flex items-center gap-3 md:gap-6 mb-10">
      {units.map(({ label, value }, i) => (
        <div key={label} className="flex items-center gap-3 md:gap-6">
          <div className="flex flex-col items-center">
            {/* Server-rendered time differs from hydration time by a tick —
                suppress the text mismatch and let the client value win */}
            <span
              suppressHydrationWarning
              className="font-serif text-2xl md:text-4xl text-bark leading-none tabular-nums"
            >
              {String(value).padStart(2, "0")}
            </span>
            <span className="font-sans text-[10px] md:text-xs tracking-widest uppercase text-bark/40 mt-1">
              {label}
            </span>
          </div>
          {i < units.length - 1 && (
            <span className="font-serif text-2xl text-gold/50 mb-3">·</span>
          )}
        </div>
      ))}
    </div>
  );
}

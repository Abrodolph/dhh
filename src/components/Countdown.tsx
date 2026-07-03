"use client";

import { useEffect, useState } from "react";

const IST_OFFSET = 330 * 60000; // +5:30

function msUntilMidnightIST(): number {
  const ist = new Date(Date.now() + IST_OFFSET);
  const intoDay =
    ist.getUTCHours() * 3600000 +
    ist.getUTCMinutes() * 60000 +
    ist.getUTCSeconds() * 1000 +
    ist.getUTCMilliseconds();
  return 86400000 - intoDay;
}

export default function Countdown() {
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    setMs(msUntilMidnightIST());
    const t = setInterval(() => setMs(msUntilMidnightIST()), 1000);
    return () => clearInterval(t);
  }, []);

  if (ms === null) return null;

  const sec = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(sec / 3600)).padStart(2, "0");
  const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");

  return (
    <p className="text-center font-condensed text-xs uppercase tracking-wider text-smoke">
      Next puzzle in{" "}
      <span className="text-accent tabular-nums">
        {hh}:{mm}:{ss}
      </span>
    </p>
  );
}

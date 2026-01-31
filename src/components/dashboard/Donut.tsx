"use client";
import React from "react";

export default function Donut({ a, b, size = 180 }: { a: number; b: number; size?: number }) {
  const total = a + b || 1;
  const aPct = a / total;

  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  const aLen = c * aPct;
  const bLen = c - aLen;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="block">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth={stroke} />

        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(59,130,246,0.75)"
          strokeWidth={stroke}
          strokeDasharray={`${aLen} ${bLen}`}
          strokeDashoffset={c * 0.25}
          strokeLinecap="round"
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(34,197,94,0.65)"
          strokeWidth={stroke}
          strokeDasharray={`${bLen} ${aLen}`}
          strokeDashoffset={c * (0.25 + aPct)}
          strokeLinecap="round"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-xs ca-muted">Total</div>
        <div className="text-lg font-semibold">{total.toLocaleString("pt-PT")}</div>
      </div>
    </div>
  );
}

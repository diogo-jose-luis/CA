"use client";
import React from "react";

export default function Gauge({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(1, value));
  const size = 220;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const startAngle = -180;
  const endAngle = 0;

  function polar(angle: number) {
    const a = (Math.PI / 180) * angle;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }

  function arcPath(a0: number, a1: number) {
    const p0 = polar(a0);
    const p1 = polar(a1);
    const large = a1 - a0 <= 180 ? 0 : 1;
    return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y}`;
  }

  const angle = startAngle + (endAngle - startAngle) * clamped;

  return (
    <div className="w-full">
      <svg width="100%" viewBox={`0 0 ${size} ${size / 1.35}`} className="block">
        <path
          d={arcPath(startAngle, endAngle)}
          fill="none"
          stroke="rgba(148,163,184,0.18)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />

        <path
          d={arcPath(startAngle, angle)}
          fill="none"
          stroke="rgba(135,55,70,0.80)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />

        <line
          x1={cx}
          y1={cy}
          x2={polar(angle).x}
          y2={polar(angle).y}
          stroke="rgba(229,231,235,0.55)"
          strokeWidth="3"
        />
        <circle cx={cx} cy={cy} r="6" fill="rgba(229,231,235,0.85)" />

        <text x={cx} y={cy + 40} textAnchor="middle" fontSize="12" fill="rgba(148,163,184,0.85)">
          {label}
        </text>
      </svg>
    </div>
  );
}

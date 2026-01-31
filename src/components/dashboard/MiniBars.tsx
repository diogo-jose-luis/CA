"use client";
import React from "react";

type Item = { label: string; value: number };

export default function MiniBars({ items }: { items: Item[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="rounded-2xl border ca-border p-3 ca-panel">
      <div className="flex items-end gap-2 h-24">
        {items.map((i) => {
          const h = Math.round((i.value / max) * 100);
          return (
            <div key={i.label} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full rounded-lg" style={{ height: "100%", background: "rgba(148,163,184,0.14)" }}>
                <div
                  className="w-full rounded-lg"
                  style={{
                    height: `${h}%`,
                    background: "rgba(135,55,70,0.70)",
                    marginTop: `${100 - h}%`,
                  }}
                />
              </div>
              <div className="text-[10px] ca-muted">{i.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

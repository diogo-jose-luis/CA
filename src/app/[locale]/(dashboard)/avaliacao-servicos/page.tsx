"use client";

import { useState } from "react";
import {
  Star,
  ClipboardCheck,
  Calendar,
  TrendingUp,
  Plus,
  X,
  Eye,
} from "lucide-react";
import { useTranslations } from "next-intl";

/* =======================
   Stats
======================= */

const stats = [
  {
    label: "total",
    value: 12,
    icon: ClipboardCheck,
    color: "text-blue-600",
    bg: "bg-blue-100/60 dark:bg-blue-900/20",
  },
  {
    label: "average",
    value: "4.3",
    icon: Star,
    color: "text-yellow-500",
    bg: "bg-yellow-100/60 dark:bg-yellow-900/20",
  },
  {
    label: "year",
    value: 6,
    icon: Calendar,
    color: "text-green-600",
    bg: "bg-green-100/60 dark:bg-green-900/20",
  },
  {
    label: "last",
    value: "Feb 2026",
    icon: TrendingUp,
    color: "text-purple-600",
    bg: "bg-purple-100/60 dark:bg-purple-900/20",
  },
];

/* =======================
   Mock Data
======================= */

const mockData = [
  {
    mes: "Fevereiro",
    ano: 2026,
    qualidade: 4,
    profissionalismo: 5,
    resposta: 4,
    comunicacao: 4,
    geral: 4.3,
    comentario: "Serviço consistente e equipa profissional.",
    data: "28/02/2026",
  },
  {
    mes: "Janeiro",
    ano: 2026,
    qualidade: 4,
    profissionalismo: 4,
    resposta: 4,
    comunicacao: 3,
    geral: 3.8,
    comentario: "Bom serviço, mas comunicação pode melhorar.",
    data: "31/01/2026",
  },
];

/* =======================
   Rating Stars
======================= */

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={16}
          className={i < value ? "text-yellow-500" : "text-slate-300"}
          fill={i < value ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

/* =======================
   Page
======================= */

export default function Page() {
  const t = useTranslations("serviceEvaluation");
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* Header */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

        <div>
          <h1 className="text-xl md:text-2xl font-semibold">
            {t("title")}
          </h1>

          <p className="text-sm ca-muted">
            {t("subtitle")}
          </p>
        </div>

        <button
          onClick={() => setShowNew(true)}
          className="ca-btn flex items-center gap-2"
        >
          <Plus size={18} />
          {t("newEvaluation")}
        </button>

      </div>

      {/* Stats */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {stats.map((item) => (
          <div key={item.label} className="ca-card p-4">

            <div className="flex items-center justify-between">

              <div>

                <div className="text-sm ca-muted">
                  {t(`stats.${item.label}`)}
                </div>

                <div className="text-2xl font-semibold mt-1">
                  {item.value}
                </div>

              </div>

              <div
                className={`h-11 w-11 rounded-2xl flex items-center justify-center ${item.bg}`}
              >
                <item.icon className={item.color} size={20} />
              </div>

            </div>

          </div>
        ))}

      </div>

      {/* Table */}

      <div className="ca-card overflow-hidden">

        <table className="w-full text-sm">

          <thead className="bg-slate-50 dark:bg-slate-800/40">

            <tr>
              <th className="py-3">{t("table.month")}</th>
              <th className="py-3">{t("table.year")}</th>
              <th className="py-3">{t("table.quality")}</th>
              <th className="py-3">{t("table.professionalism")}</th>
              <th className="py-3">{t("table.response")}</th>
              <th className="py-3">{t("table.communication")}</th>
              <th className="py-3">{t("table.general")}</th>
              <th className="py-3">{t("table.comments")}</th>
              <th className="py-3">{t("table.date")}</th>
              <th className="py-3">{t("table.actions")}</th>
            </tr>

          </thead>

          <tbody className="divide-y ca-border">

            {mockData.map((row, idx) => (

              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">

                <td className="px-4 py-3">{row.mes}</td>
                <td className="px-4 py-3">{row.ano}</td>
                <td className="px-4 py-3"><Stars value={row.qualidade} /></td>
                <td className="px-4 py-3"><Stars value={row.profissionalismo} /></td>
                <td className="px-4 py-3"><Stars value={row.resposta} /></td>
                <td className="px-4 py-3"><Stars value={row.comunicacao} /></td>
                <td className="px-4 py-3 font-medium">{row.geral}</td>
                <td className="px-4 py-3 max-w-xs truncate">{row.comentario}</td>
                <td className="px-4 py-3">{row.data}</td>

                <td className="px-4 py-3 text-right">
                  <button className="ca-icon-btn">
                    <Eye size={16} />
                  </button>
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      {/* OffCanvas */}

      {showNew && (

        <div className="fixed inset-0 z-50 flex">

          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowNew(false)}
          />

          <div className="relative ml-auto h-full w-full max-w-md ca-panel shadow-2xl flex flex-col">

            <div className="flex items-center justify-between p-4 border-b ca-border">

              <h2 className="text-lg font-semibold">
                {t("form.title")}
              </h2>

              <button onClick={() => setShowNew(false)}>
                <X size={20} />
              </button>

            </div>

            <form className="p-4 space-y-4 overflow-y-auto flex-1 ca-scroll">

              <select className="ca-input">
                <option>{t("form.month")}</option>
              </select>

              <input type="number" className="ca-input" placeholder={t("form.year")} />

              <input type="number" className="ca-input" placeholder={t("form.quality")} />

              <input type="number" className="ca-input" placeholder={t("form.professionalism")} />

              <input type="number" className="ca-input" placeholder={t("form.response")} />

              <input type="number" className="ca-input" placeholder={t("form.communication")} />

              <textarea
                className="ca-input"
                rows={4}
                placeholder={t("form.comments")}
              />

            </form>

            <div className="p-4 border-t ca-border flex justify-end gap-2">

              <button
                className="px-4 py-2 rounded-xl border ca-border"
                onClick={() => setShowNew(false)}
              >
                {t("cancel")}
              </button>

              <button className="ca-btn">
                {t("form.submit")}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}
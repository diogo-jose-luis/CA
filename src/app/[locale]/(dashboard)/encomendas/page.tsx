"use client";

import { useState } from "react";
import {
  Package,
  CheckCircle,
  Clock,
  Plus,
  X,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";

/* =======================
   Stats
======================= */

const stats = [
  {
    label: "total",
    value: 18,
    icon: Package,
    color: "text-blue-600",
    bg: "bg-blue-100/60 dark:bg-blue-900/20",
  },
  {
    label: "pending",
    value: 7,
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-100/60 dark:bg-amber-900/20",
  },
  {
    label: "delivered",
    value: 11,
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-100/60 dark:bg-green-900/20",
  },
];

/* =======================
   Mock Data
======================= */

const mockData = [
  {
    ordem: "EN-001",
    data: "15/02/2026",
    hora: "10:30",
    remetente: "DHL",
    destinatario: "Carlos Silva",
    descricao: "Documentos administrativos",
    estado: "Pendente",
    entregueA: "-",
  },
  {
    ordem: "EN-002",
    data: "14/02/2026",
    hora: "16:15",
    remetente: "Maria Lopes",
    destinatario: "João Costa",
    descricao: "Peça de equipamento",
    estado: "Entregue",
    entregueA: "João Costa",
  },
];

/* =======================
   Status Badge
======================= */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Pendente:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    Entregue:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${map[status]}`}>
      {status}
    </span>
  );
}

/* =======================
   Page
======================= */

export default function Page() {
  const t = useTranslations("packages");

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
          {t("new")}
        </button>

      </div>

      {/* Stats */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

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

      {/* Filters */}

      <div className="ca-card p-4">

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">

          <input
            className="ca-input"
            placeholder={t("filters.search")}
          />

          <select className="ca-input">
            <option>{t("filters.status")}</option>
            <option>{t("status.pending")}</option>
            <option>{t("status.delivered")}</option>
          </select>

          <input type="date" className="ca-input" />

          <button className="ca-btn md:col-span-4">
            {t("filters.apply")}
          </button>

        </div>

      </div>

      {/* Table */}

      <div className="ca-card overflow-hidden">

        <table className="w-full text-sm">

          <thead className="bg-slate-50 dark:bg-slate-800/40">

            <tr>
              <th className="py-3">{t("table.order")}</th>
              <th className="py-3">{t("table.date")}</th>
              <th className="py-3">{t("table.time")}</th>
              <th className="py-3">{t("table.sender")}</th>
              <th className="py-3">{t("table.receiver")}</th>
              <th className="py-3">{t("table.description")}</th>
              <th className="py-3">{t("table.status")}</th>
              <th className="py-3">{t("table.deliveredTo")}</th>
              <th className="py-3">{t("table.actions")}</th>
            </tr>

          </thead>

          <tbody className="divide-y ca-border">

            {mockData.map((row, idx) => (

              <tr
                key={idx}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
              >

                <td className="px-4 py-3 font-medium">{row.ordem}</td>
                <td className="px-4 py-3">{row.data}</td>
                <td className="px-4 py-3">{row.hora}</td>
                <td className="px-4 py-3">{row.remetente}</td>
                <td className="px-4 py-3">{row.destinatario}</td>
                <td className="px-4 py-3">{row.descricao}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.estado} />
                </td>
                <td className="px-4 py-3">{row.entregueA}</td>

                {/* Actions */}

                <td className="px-4 py-3 text-right">

                  <div className="flex justify-end gap-2">

                    <button className="ca-icon-btn">
                      <Eye size={16} />
                    </button>

                    <button className="ca-icon-btn">
                      <Pencil size={16} />
                    </button>

                    <button className="ca-icon-btn text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">
                      <Trash2 size={16} />
                    </button>

                  </div>

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

            <form className="p-4 space-y-4 flex-1 overflow-y-auto ca-scroll">

              <input className="ca-input" placeholder={t("form.order")} />

              <input type="date" className="ca-input" />

              <input type="time" className="ca-input" />

              <input className="ca-input" placeholder={t("form.sender")} />

              <input className="ca-input" placeholder={t("form.receiver")} />

              <textarea
                className="ca-input"
                rows={4}
                placeholder={t("form.description")}
              />

              <input className="ca-input" placeholder={t("form.security")} />

              <textarea
                className="ca-input"
                rows={3}
                placeholder={t("form.notes")}
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
                {t("form.save")}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}
"use client";

import { useState } from "react";
import {
  Key,
  CheckCircle,
  Building2,
  Users,
  Plus,
  X,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";

/* ================
   Stats
================ */

const stats = [
  {
    label: "total",
    value: 5,
    icon: Key,
    color: "text-blue-600",
    bg: "bg-blue-100/60 dark:bg-blue-900/20",
  },
  {
    label: "returned",
    value: 3,
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-100/60 dark:bg-green-900/20",
  },
  {
    label: "sectors",
    value: 5,
    icon: Building2,
    color: "text-amber-600",
    bg: "bg-amber-100/60 dark:bg-amber-900/20",
  },
  {
    label: "employees",
    value: 5,
    icon: Users,
    color: "text-purple-600",
    bg: "bg-purple-100/60 dark:bg-purple-900/20",
  },
];

/* ================
   Mock Data
================ */

const mockData = [
  {
    id: 1,
    data: "15/02/2026",
    setor: "Armazém",
    solicitante: "Carlos Silva",
    saida: "09:30",
    assinatura: "Assinado",
    devolvidaPor: "Carlos Silva",
    devolucao: "12:45",
  },
  {
    id: 2,
    data: "14/02/2026",
    setor: "Manutenção",
    solicitante: "João Costa",
    saida: "08:15",
    assinatura: "Assinado",
    devolvidaPor: "-",
    devolucao: "-",
  },
];

/* ================
   Page
================ */

export default function Page() {
  const t = useTranslations("keys");

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

      {/* Filters */}

      <div className="ca-card p-4">

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">

          <input
            className="ca-input"
            placeholder={t("filters.search")}
          />

          <select className="ca-input">
            <option>{t("filters.sector")}</option>
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
              <th className="py-3">{t("table.id")}</th>
              <th className="py-3">{t("table.date")}</th>
              <th className="py-3">{t("table.sector")}</th>
              <th className="py-3">{t("table.employee")}</th>
              <th className="py-3">{t("table.exitTime")}</th>
              <th className="py-3">{t("table.signature")}</th>
              <th className="py-3">{t("table.returnedBy")}</th>
              <th className="py-3">{t("table.returnTime")}</th>
              <th className="py-3">{t("table.actions")}</th>
            </tr>

          </thead>

          <tbody className="divide-y ca-border">

            {mockData.map((row, idx) => (

              <tr
                key={idx}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
              >

                <td className="px-4 py-3">{row.id}</td>
                <td className="px-4 py-3">{row.data}</td>
                <td className="px-4 py-3">{row.setor}</td>
                <td className="px-4 py-3">{row.solicitante}</td>
                <td className="px-4 py-3">{row.saida}</td>
                <td className="px-4 py-3">{row.assinatura}</td>
                <td className="px-4 py-3">{row.devolvidaPor}</td>
                <td className="px-4 py-3">{row.devolucao}</td>

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

              <input className="ca-input" placeholder={t("form.employee")} />

              <input className="ca-input" placeholder={t("form.sector")} />

              <input type="date" className="ca-input" />

              <input type="time" className="ca-input" />

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
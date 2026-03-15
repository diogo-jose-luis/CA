"use client";

import { useState } from "react";
import {
  Bell,
  AlertTriangle,
  Info,
  Plus,
  X,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";

/* =======================
   Mock data
======================= */

const stats = [
  {
    label: "active",
    value: 7,
    icon: Bell,
    color: "text-blue-600",
    bg: "bg-blue-100/60 dark:bg-blue-900/20",
  },
  {
    label: "highPriority",
    value: 2,
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-100/60 dark:bg-red-900/20",
  },
  {
    label: "informative",
    value: 5,
    icon: Info,
    color: "text-slate-600",
    bg: "bg-slate-100/60 dark:bg-slate-800/40",
  },
];

const mockData = [
  {
    titulo: "Interrupção no fornecimento de água",
    categoria: "Manutenção",
    prioridade: "Alta",
    publicadoEm: "12/02/2026",
    estado: "Activo",
  },
  {
    titulo: "Assembleia geral de condóminos",
    categoria: "Reunião",
    prioridade: "Normal",
    publicadoEm: "10/02/2026",
    estado: "Activo",
  },
  {
    titulo: "Horário especial da portaria",
    categoria: "Informação",
    prioridade: "Normal",
    publicadoEm: "08/02/2026",
    estado: "Activo",
  },
  {
    titulo: "Manutenção preventiva dos elevadores",
    categoria: "Manutenção",
    prioridade: "Alta",
    publicadoEm: "05/02/2026",
    estado: "Encerrado",
  },
  {
    titulo: "Recolha de lixo – novo horário",
    categoria: "Informação",
    prioridade: "Normal",
    publicadoEm: "01/02/2026",
    estado: "Activo",
  },
];

/* =======================
   Helpers
======================= */

function PrioridadeBadge({ prioridade }: { prioridade: string }) {
  const t = useTranslations("notices");

  const map: Record<string, string> = {
    Alta: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    Normal: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };

  const labelMap: Record<string, string> = {
    Alta: t("priority.high"),
    Normal: t("priority.normal"),
  };

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium ${map[prioridade]}`}
    >
      {labelMap[prioridade]}
    </span>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const t = useTranslations("notices");

  const map: Record<string, string> = {
    Activo:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    Encerrado:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };

  const labelMap: Record<string, string> = {
    Activo: t("status.active"),
    Encerrado: t("status.closed"),
  };

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium ${map[estado]}`}
    >
      {labelMap[estado]}
    </span>
  );
}

/* =======================
   Page
======================= */

export default function Page() {
  const t = useTranslations("notices");
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">{t("title")}</h1>

          <p className="text-sm ca-muted">{t("subtitle")}</p>
        </div>

        <button
          onClick={() => setShowNew(true)}
          className="ca-btn flex items-center gap-2"
        >
          <Plus size={18} />
          {t("newNotice")}
        </button>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {stats.map((item) => (
          <div key={item.label} className="ca-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm ca-muted">
                  {t(`stats.${item.label}`)}
                </div>
                <div className="text-2xl font-semibold mt-1">{item.value}</div>
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

      {/* Filtros */}
      <div className="ca-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input className="ca-input" placeholder={t("filters.search")} />
          <select className="ca-input">
            <option>{t("filters.category")}</option>
            <option>{t("categories.maintenance")}</option>
            <option>{t("categories.meeting")}</option>
            <option>{t("categories.information")}</option>
          </select>
          <select className="ca-input">
            <option>{t("filters.priority")}</option>
            <option>{t("priority.high")}</option>
            <option>{t("priority.normal")}</option>
          </select>
          <select className="ca-input">
            <option>{t("filters.status")}</option>
            <option>{t("status.active")}</option>
            <option>{t("status.closed")}</option>
          </select>
          <button className="ca-btn md:col-span-5">{t("filters.apply")}</button>
        </div>
      </div>

      {/* Tabela */}
      <div className="ca-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/40">
            <tr>
              <th className="py-3">{t("table.title")}</th>
              <th className="py-3">{t("table.category")}</th>
              <th className="py-3">{t("table.priority")}</th>
              <th className="py-3">{t("table.published")}</th>
              <th className="py-3">{t("table.status")}</th>
              <th className="py-3">{t("table.actions")}</th>
            </tr>
          </thead>

          <tbody className="divide-y ca-border">
            {mockData.map((row, idx) => (
              <tr
                key={idx}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
              >
                <td className="px-4 py-3 font-medium">{row.titulo}</td>
                <td className="px-4 py-3">{row.categoria}</td>
                <td className="px-4 py-3">
                  <PrioridadeBadge prioridade={row.prioridade} />
                </td>
                <td className="px-4 py-3">{row.publicadoEm}</td>
                <td className="px-4 py-3">
                  <EstadoBadge estado={row.estado} />
                </td>

                {/* Ações */}
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="ca-icon-btn" title={t("actions.view")}>
                      <Eye size={16} />
                    </button>
                    <button className="ca-icon-btn" title={t("actions.edit")}>
                      <Pencil size={16} />
                    </button>
                    <button
                      className="ca-icon-btn text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                      title={t("actions.remove")}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* OffCanvas / Novo Aviso */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowNew(false)}
          />
          <div className="relative ml-auto h-full w-full max-w-md ca-panel shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b ca-border">
              <h2 className="text-lg font-semibold">{t("form.title")}</h2>
              <button onClick={() => setShowNew(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="p-4 space-y-4 flex-1 overflow-y-auto ca-scroll">
              <input
                className="ca-input"
                placeholder={t("form.titlePlaceholder")}
              />

              <select className="ca-input">
                <option>{t("filters.category")}</option>
                <option>{t("categories.maintenance")}</option>
                <option>{t("categories.meeting")}</option>
                <option>{t("categories.information")}</option>
              </select>
              <select className="ca-input">
                <option>{t("filters.priority")}</option>
                <option>{t("priority.high")}</option>
                <option>{t("priority.normal")}</option>
              </select>
              <textarea
                className="ca-input"
                placeholder={t("form.message")}
                rows={6}
              />
            </form>

            <div className="p-4 border-t ca-border flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border ca-border"
                onClick={() => setShowNew(false)}
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                className="ca-btn"
                onClick={(e) => {
                  e.preventDefault();
                  setShowNew(false);
                }}
              >
                {t("form.publish")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

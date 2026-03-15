//app/%5Blocale%5D/%28dashboard%29/people-access/page.tsx
"use client";

import { useState } from "react";
import {
  Users,
  LogIn,
  LogOut,
  Clock,
  Plus,
  X,
  Eye,
  Pencil,
  Trash2,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";

/* =======================
   Mock data
======================= */

const stats = [
  {
    label: "Pessoas no Interior",
    value: 132,
    icon: Users,
    color: "text-green-600",
    bg: "bg-green-100/60 dark:bg-green-900/20",
  },
  {
    label: "Entradas Hoje",
    value: 389,
    icon: LogIn,
    color: "text-blue-600",
    bg: "bg-blue-100/60 dark:bg-blue-900/20",
  },
  {
    label: "Saídas Registadas",
    value: 341,
    icon: LogOut,
    color: "text-slate-600",
    bg: "bg-slate-100/60 dark:bg-slate-800/40",
  },
  {
    label: "Pendentes / Atrasadas",
    value: 48,
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-100/60 dark:bg-amber-900/20",
  },
];

const mockData = [
  {
    foto: "/people/stiviandra2.jpg",
    nome: "Stiviandra Oliveira",
    tipo: "Colaboradora",
    documento: "Cartão Interno",
    destino: "Administração",
    entrada: "08:01",
    saida: "17:05",
    estado: "Saiu",
  },
  {
    foto: "/people/IMG_1063.jpg",
    nome: "António Jamba",
    tipo: "Visitante",
    documento: "BI 00938472LA042",
    destino: "Departamento de segurança",
    entrada: "09:12",
    saida: "--",
    estado: "No interior",
  },
  {
    foto: "/people/IMG_9732.jpg",
    nome: "Paulo Henrique",
    tipo: "Prestador",
    documento: "Empresa Terceira",
    destino: "Oficina Técnica",
    entrada: "07:45",
    saida: "--",
    estado: "Atrasado",
  },
  {
    foto: "/people/oliveira2.jpg",
    nome: "João Miguel",
    tipo: "Visitante",
    documento: "BI 00329847LA031",
    destino: "Bloco C",
    entrada: "10:22",
    saida: "--",
    estado: "No interior",
  },
  {
    foto: "/people/marlene2.jpg",
    nome: "Helena Sousa",
    tipo: "Colaboradora",
    documento: "Cartão Interno",
    destino: "Recursos Humanos",
    entrada: "07:58",
    saida: "--",
    estado: "No interior",
  },
  {
    foto: "/people/IMG_9724.jpg",
    nome: "Domingos André",
    tipo: "Prestador",
    documento: "Construtora Alfa",
    destino: "Armazém",
    entrada: "06:50",
    saida: "15:40",
    estado: "Saiu",
  },
  {
    foto: "/people/sara2.jpg",
    nome: "Rita Maria Matias",
    tipo: "Visitante",
    documento: "BI 00217364LA021",
    destino: "Loja 04",
    entrada: "11:10",
    saida: "--",
    estado: "No interior",
  },
  {
    foto: "/people/fatima2.jpg",
    nome: "Teresa Miguel",
    tipo: "Visitante",
    documento: "BI 00873412LA054",
    destino: "Departamento de manutenção",
    entrada: "09:40",
    saida: "--",
    estado: "Atrasado",
  },
  {
    foto: "/people/IMG_9777.jpg",
    nome: "António Costa",
    tipo: "Prestador",
    documento: "Manutenção Elétrica",
    destino: "Quadro Eléctrico Central",
    entrada: "08:20",
    saida: "--",
    estado: "No interior",
  },
];

/* =======================
   Helpers
======================= */

function EstadoBadge({ estado }: { estado: string }) {
  const t = useTranslations("peopleAccess");

  const map: Record<string, string> = {
    "No interior":
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    Saiu: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    Atrasado:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };

  const labelMap: Record<string, string> = {
    "No interior": t("status.inside"),
    Saiu: t("status.left"),
    Atrasado: t("status.late"),
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
  const t = useTranslations("peopleAccess");
  const [showNewAccess, setShowNewAccess] = useState(false);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm ca-muted">{t("subtitle")}</p>
        </div>

        <button
          onClick={() => setShowNewAccess(true)}
          className="ca-btn flex items-center gap-2"
        >
          <Plus size={18} />
          {t("newAccess")}
        </button>
      </div>

      {/* Filtros */}
      <div className="ca-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          <input
            className="ca-input md:col-span-2"
            placeholder={t("filters.nameOrDocument")}
          />
          <input className="ca-input" placeholder={t("filters.destination")} />
          <select className="ca-input">
            <option>{t("filters.type")}</option>
            <option>{t("types.visitor")}</option>
            <option>{t("types.employee")}</option>
            <option>{t("types.contractor")}</option>
          </select>
          <select className="ca-input">
            <option>{t("filters.status")}</option>
            <option>{t("status.inside")}</option>
            <option>{t("status.left")}</option>
            <option>{t("status.late")}</option>
          </select>
          <input type="date" className="ca-input" />
          <input type="date" className="ca-input" />
          <button className="ca-btn md:col-span-7">{t("filters.apply")}</button>
        </div>
      </div>

      {/* Tabela */}
      <div className="ca-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/40">
            <tr>
              <th className="px-4 py-3">{t("table.person")}</th>
              <th className="px-4 py-3">{t("table.name")}</th>
              <th className="px-4 py-3">{t("table.type")}</th>
              <th className="px-4 py-3">{t("table.document")}</th>
              <th className="px-4 py-3">{t("table.destination")}</th>
              <th className="px-4 py-3">{t("table.entry")}</th>
              <th className="px-4 py-3">{t("table.exit")}</th>
              <th className="px-4 py-3">{t("table.status")}</th>
              <th className="px-4 py-3 text-right">{t("table.actions")}</th>
            </tr>
          </thead>

          <tbody className="divide-y ca-border">
            {mockData.map((row, idx) => (
              <tr
                key={idx}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
              >
                <td className="px-4 py-3">
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    {row.foto ? (
                      <img
                        src={row.foto}
                        alt={row.nome}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User size={18} />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium">{row.nome}</td>
                <td className="px-4 py-3">{row.tipo}</td>
                <td className="px-4 py-3 ca-muted">{row.documento}</td>
                <td className="px-4 py-3">{row.destino}</td>
                <td className="px-4 py-3">{row.entrada}</td>
                <td className="px-4 py-3">{row.saida}</td>
                <td className="px-4 py-3">
                  <EstadoBadge estado={row.estado} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="ca-icon-btn">
                      <Eye size={16} />
                    </button>
                    <button className="ca-icon-btn">
                      <Pencil size={16} />
                    </button>
                    <button className="ca-icon-btn text-red-600">
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
      {showNewAccess && (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-[100] flex">
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowNewAccess(false)}
          />

          {/* offcanvas */}
          <div className="absolute right-0 top-0 h-screen w-full max-w-md ca-panel flex flex-col">
            <div className="p-4 border-b ca-border flex justify-between">
              <h2 className="font-semibold">{t("form.title")}</h2>
              <button onClick={() => setShowNewAccess(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="p-4 space-y-4 flex-1 overflow-y-auto">
              <input className="ca-input" placeholder={t("form.fullName")} />
              <select className="ca-input">
                <option>{t("form.personType")}</option>
                <option>{t("types.visitor")}</option>
                <option>{t("types.employee")}</option>
                <option>{t("types.contractor")}</option>
              </select>
              <input className="ca-input" placeholder={t("form.document")} />
              <input className="ca-input" placeholder={t("form.destination")} />
              <input type="time" className="ca-input" />
              <textarea
                className="ca-input"
                placeholder={t("form.notes")}
                rows={3}
              />
            </form>

            <div className="p-4 border-t ca-border flex justify-end gap-2">
              <button
                className="px-4 py-2 border rounded-xl"
                onClick={() => setShowNewAccess(false)}
              >
                {t("cancel")}
              </button>

              <button className="ca-btn">{t("form.register")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

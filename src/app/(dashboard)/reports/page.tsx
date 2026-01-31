"use client";

import { useState } from "react";
import {
  FileText,
  Users,
  Car,
  Home,
  Bell,
  Download,
  FileSpreadsheet,
  Eye,
  Calendar,
} from "lucide-react";

/* =======================
   Mock data
======================= */

const stats = [
  {
    label: "Relatórios Gerados (Mês)",
    value: 42,
    icon: FileText,
    color: "text-blue-600",
    bg: "bg-blue-100/60 dark:bg-blue-900/20",
  },
  {
    label: "Relatórios de Acessos",
    value: 21,
    icon: Users,
    color: "text-green-600",
    bg: "bg-green-100/60 dark:bg-green-900/20",
  },
  {
    label: "Relatórios de Veículos",
    value: 13,
    icon: Car,
    color: "text-slate-600",
    bg: "bg-slate-100/60 dark:bg-slate-800/40",
  },
  {
    label: "Relatórios Administrativos",
    value: 8,
    icon: Home,
    color: "text-amber-600",
    bg: "bg-amber-100/60 dark:bg-amber-900/20",
  },
];

const availableReports = [
  {
    nome: "Relatório de Acesso de Pessoas",
    modulo: "Acessos",
    formatos: ["PDF", "Excel"],
  },
  {
    nome: "Relatório de Acesso de Veículos",
    modulo: "Veículos",
    formatos: ["PDF", "Excel"],
  },
  {
    nome: "Relatório de Cartões Activos",
    modulo: "Cartões",
    formatos: ["PDF"],
  },
  {
    nome: "Relatório de Moradias e Ocupação",
    modulo: "Moradias",
    formatos: ["PDF", "Excel"],
  },
  {
    nome: "Relatório de Avisos Publicados",
    modulo: "Avisos",
    formatos: ["PDF"],
  },
];

const history = [
  {
    relatorio: "Acesso de Pessoas",
    periodo: "01/02/2026 - 15/02/2026",
    formato: "PDF",
    geradoEm: "15/02/2026 10:32",
  },
  {
    relatorio: "Acesso de Veículos",
    periodo: "01/02/2026 - 10/02/2026",
    formato: "Excel",
    geradoEm: "10/02/2026 08:14",
  },
  {
    relatorio: "Moradias e Ocupação",
    periodo: "01/01/2026 - 31/01/2026",
    formato: "PDF",
    geradoEm: "02/02/2026 16:45",
  },
];

/* =======================
   Page
======================= */

export default function Page() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-semibold">Relatórios</h1>
        <p className="text-sm ca-muted">
          Geração e exportação de relatórios operacionais e administrativos.
        </p>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((item) => (
          <div key={item.label} className="ca-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm ca-muted">{item.label}</div>
                <div className="text-2xl font-semibold mt-1">{item.value}</div>
              </div>
              <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${item.bg}`}>
                <item.icon className={item.color} size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros globais */}
      <div className="ca-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select className="ca-input">
            <option>Tipo de relatório</option>
            <option>Acessos</option>
            <option>Veículos</option>
            <option>Cartões</option>
            <option>Moradias</option>
            <option>Avisos</option>
          </select>

          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
            <input
              type="date"
              className="ca-input pl-9"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
            <input
              type="date"
              className="ca-input pl-9"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <button className="ca-btn md:col-span-5">Aplicar filtros</button>
        </div>
      </div>

      {/* Relatórios disponíveis */}
      <div className="ca-card">
        <div className="p-4 border-b ca-border font-medium">
          Relatórios disponíveis
        </div>

        <div className="divide-y ca-border">
          {availableReports.map((rep, idx) => (
            <div
              key={idx}
              className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
            >
              <div>
                <div className="font-medium">{rep.nome}</div>
                <div className="text-xs ca-muted">Módulo: {rep.modulo}</div>
              </div>

              <div className="flex gap-2">
                {rep.formatos.includes("PDF") && (
                  <button className="ca-icon-btn" title="Gerar PDF">
                    <Download size={16} />
                  </button>
                )}
                {rep.formatos.includes("Excel") && (
                  <button className="ca-icon-btn" title="Gerar Excel">
                    <FileSpreadsheet size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Histórico */}
      <div className="ca-card overflow-hidden">
        <div className="p-4 border-b ca-border font-medium">
          Histórico de relatórios gerados
        </div>

        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Relatório</th>
              <th className="px-4 py-3 text-left font-medium">Período</th>
              <th className="px-4 py-3 text-left font-medium">Formato</th>
              <th className="px-4 py-3 text-left font-medium">Gerado em</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y ca-border">
            {history.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-medium">{row.relatorio}</td>
                <td className="px-4 py-3">{row.periodo}</td>
                <td className="px-4 py-3">{row.formato}</td>
                <td className="px-4 py-3">{row.geradoEm}</td>
                <td className="px-4 py-3 text-right">
                  <button className="ca-icon-btn" title="Visualizar">
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

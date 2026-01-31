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

/* =======================
   Mock data
======================= */

const stats = [
  {
    label: "Avisos Activos",
    value: 7,
    icon: Bell,
    color: "text-blue-600",
    bg: "bg-blue-100/60 dark:bg-blue-900/20",
  },
  {
    label: "Alta Prioridade",
    value: 2,
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-100/60 dark:bg-red-900/20",
  },
  {
    label: "Informativos",
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
  const map: Record<string, string> = {
    Alta: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    Normal:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${map[prioridade]}`}>
      {prioridade}
    </span>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    Activo:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    Encerrado:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${map[estado]}`}>
      {estado}
    </span>
  );
}

/* =======================
   Page
======================= */

export default function Page() {
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Avisos</h1>
          <p className="text-sm ca-muted">
            Avisos do síndico ou da gestão do condomínio para os residentes.
          </p>
        </div>

        <button
          onClick={() => setShowNew(true)}
          className="ca-btn flex items-center gap-2"
        >
          <Plus size={18} />
          Novo aviso
        </button>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {stats.map((item) => (
          <div key={item.label} className="ca-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm ca-muted">{item.label}</div>
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

      {/* Filtros */}
      <div className="ca-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input className="ca-input" placeholder="Pesquisar por título" />
          <select className="ca-input">
            <option>Categoria</option>
            <option>Manutenção</option>
            <option>Reunião</option>
            <option>Informação</option>
          </select>
          <select className="ca-input">
            <option>Prioridade</option>
            <option>Alta</option>
            <option>Normal</option>
          </select>
          <select className="ca-input">
            <option>Estado</option>
            <option>Activo</option>
            <option>Encerrado</option>
          </select>
          <button className="ca-btn md:col-span-5">Aplicar filtros</button>
        </div>
      </div>

      {/* Tabela */}
      <div className="ca-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Título</th>
              <th className="px-4 py-3 text-left font-medium">Categoria</th>
              <th className="px-4 py-3 text-left font-medium">Prioridade</th>
              <th className="px-4 py-3 text-left font-medium">Publicado em</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
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
                    <button className="ca-icon-btn" title="Ver aviso">
                      <Eye size={16} />
                    </button>
                    <button className="ca-icon-btn" title="Editar">
                      <Pencil size={16} />
                    </button>
                    <button
                      className="ca-icon-btn text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                      title="Remover"
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
              <h2 className="text-lg font-semibold">Novo aviso</h2>
              <button onClick={() => setShowNew(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="p-4 space-y-4 flex-1 overflow-y-auto ca-scroll">
              <input className="ca-input" placeholder="Título do aviso" />
              <select className="ca-input">
                <option>Categoria</option>
                <option>Manutenção</option>
                <option>Reunião</option>
                <option>Informação</option>
              </select>
              <select className="ca-input">
                <option>Prioridade</option>
                <option>Alta</option>
                <option>Normal</option>
              </select>
              <textarea
                className="ca-input"
                placeholder="Mensagem do aviso"
                rows={6}
              />
            </form>

            <div className="p-4 border-t ca-border flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border ca-border"
                onClick={() => setShowNew(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="ca-btn"
                onClick={(e) => {
                  e.preventDefault();
                  setShowNew(false);
                }}
              >
                Publicar aviso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

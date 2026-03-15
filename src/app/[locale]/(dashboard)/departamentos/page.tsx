"use client";

import { useState } from "react";
import {
  Layers,
  Plus,
  X,
  Pencil,
  Trash2,
} from "lucide-react";

/* =======================
   Mock Data
======================= */

const stats = [
  {
    label: "Total de Áreas",
    value: 5,
    icon: Layers,
    color: "text-blue-600",
    bg: "bg-blue-100/60 dark:bg-blue-900/20",
  },
  {
    label: "Áreas Operacionais",
    value: 4,
    icon: Layers,
    color: "text-green-600",
    bg: "bg-green-100/60 dark:bg-green-900/20",
  },
  {
    label: "Áreas Inativas",
    value: 1,
    icon: Layers,
    color: "text-slate-600",
    bg: "bg-slate-100/60 dark:bg-slate-800/40",
  },
];

const mockData = [
  {
    id: 1,
    designacao: "Área 1",
    descricao: "Zona administrativa principal.",
  },
  {
    id: 2,
    designacao: "Área 2",
    descricao: "Zona técnica e manutenção.",
  },
  {
    id: 3,
    designacao: "Área 3",
    descricao: "Zona residencial bloco A.",
  },
  {
    id: 4,
    designacao: "Área 4",
    descricao: "Zona industrial de produção.",
  },
  {
    id: 5,
    designacao: "Área 5",
    descricao: "Zona de estacionamento interno.",
  },
];

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
          <h1 className="text-xl md:text-2xl font-semibold">
            Áreas
          </h1>
          <p className="text-sm ca-muted">
            Gestão de áreas internas do condomínio ou instalação.
          </p>
        </div>

        <button
          onClick={() => setShowNew(true)}
          className="ca-btn flex items-center gap-2"
        >
          <Plus size={18} />
          Nova área
        </button>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {stats.map((item) => (
          <div key={item.label} className="ca-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm ca-muted">
                  {item.label}
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

      {/* Filtros */}
      <div className="ca-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="ca-input"
            placeholder="Pesquisar por designação"
          />
          <input
            className="ca-input"
            placeholder="Pesquisar por descrição"
          />
          <button className="ca-btn md:col-span-3">
            Aplicar filtros
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="ca-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium">#</th>
              <th className="px-4 py-3 text-left font-medium">
                Designação
              </th>
              <th className="px-4 py-3 text-left font-medium">
                Descrição
              </th>
              <th className="px-4 py-3 text-right font-medium">
                Ações
              </th>
            </tr>
          </thead>

          <tbody className="divide-y ca-border">
            {mockData.map((row, index) => (
              <tr
                key={row.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
              >
                <td className="px-4 py-3 font-medium">
                  {index + 1}
                </td>
                <td className="px-4 py-3 font-medium">
                  {row.designacao}
                </td>
                <td className="px-4 py-3 ca-muted">
                  {row.descricao}
                </td>

                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      className="ca-icon-btn"
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="ca-icon-btn text-red-600"
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

      {/* Modal Novo Registo */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowNew(false)}
          />

          <div className="relative ml-auto h-full w-full max-w-md ca-panel shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b ca-border">
              <h2 className="text-lg font-semibold">
                Nova área
              </h2>
              <button onClick={() => setShowNew(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="p-4 space-y-4 flex-1 overflow-y-auto ca-scroll">
              <input
                className="ca-input"
                placeholder="Designação"
              />
              <textarea
                className="ca-input"
                placeholder="Descrição"
                rows={3}
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
                Registar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import { useState } from "react";
import {
  Car,
  LogIn,
  LogOut,
  Clock,
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
    label: "Veículos no Interior",
    value: 54,
    icon: Car,
    color: "text-green-600",
    bg: "bg-green-100/60 dark:bg-green-900/20",
  },
  {
    label: "Entradas Hoje",
    value: 127,
    icon: LogIn,
    color: "text-blue-600",
    bg: "bg-blue-100/60 dark:bg-blue-900/20",
  },
  {
    label: "Saídas Registadas",
    value: 98,
    icon: LogOut,
    color: "text-slate-600",
    bg: "bg-slate-100/60 dark:bg-slate-800/40",
  },
  {
    label: "Pendentes / Irregulares",
    value: 11,
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-100/60 dark:bg-amber-900/20",
  },
];

const mockData = [
  {
    foto: "/vehicles/chevrolet_spark_lite.png",
    matricula: "LD-45-23-AG",
    tipo: "Ligeiro",
    condutor: "Carlos Manuel",
    entidade: "Visitante",
    entrada: "08:32",
    saida: "--",
    estado: "No interior",
  },
  {
    foto: "/vehicles/hyundai_elantra_2.0_2017.png",
    matricula: "LD-19-88-BZ",
    tipo: "Pesado",
    condutor: "Empresa Alfa",
    entidade: "Fornecedor",
    entrada: "06:45",
    saida: "15:20",
    estado: "Saiu",
  },
  {
    foto: "/vehicles/suzuki_alto.png",
    matricula: "LD-02-61-KL",
    tipo: "Ligeiro",
    condutor: "Ana Domingos",
    entidade: "Colaboradora",
    entrada: "07:55",
    saida: "--",
    estado: "No interior",
  },
  {
    foto: "/vehicles/suzuki_express.png",
    matricula: "LD-77-14-XP",
    tipo: "Autocarro",
    condutor: "Transportes Beta",
    entidade: "Prestador",
    entrada: "05:30",
    saida: "--",
    estado: "Atrasado",
  },
  {
    foto: "/vehicles/toyota_yaris.png",
    matricula: "LD-90-03-ZA",
    tipo: "Ligeiro",
    condutor: "João Miguel",
    entidade: "Visitante",
    entrada: "10:05",
    saida: "--",
    estado: "No interior",
  },
];

/* =======================
   Helpers
======================= */

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    "No interior":
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    Saiu:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    Atrasado:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
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
  const [showNewAccess, setShowNewAccess] = useState(false);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">
            Acesso de Veículos
          </h1>
          <p className="text-sm ca-muted">
            Controlo de entrada e saída de viaturas no perímetro da portaria.
          </p>
        </div>

        <button
          onClick={() => setShowNewAccess(true)}
          className="ca-btn flex items-center gap-2"
        >
          <Plus size={18} />
          Registar novo acesso
        </button>
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

      {/* Tabela */}
      <div className="ca-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Veículo</th>
              <th className="px-4 py-3 text-left font-medium">Matrícula</th>
              <th className="px-4 py-3 text-left font-medium">Tipo</th>
              <th className="px-4 py-3 text-left font-medium">Condutor / Empresa</th>
              <th className="px-4 py-3 text-left font-medium">Entidade</th>
              <th className="px-4 py-3 text-left font-medium">Entrada</th>
              <th className="px-4 py-3 text-left font-medium">Saída</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y ca-border">
            {mockData.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                {/* Foto */}
                <td className="px-4 py-3">
                  <div className="h-10 w-14 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700">
                    <img
                      src={row.foto}
                      alt="Veículo"
                      className="h-full w-full object-cover"
                      onError={(e) =>
                        ((e.target as HTMLImageElement).src = "/vehicles/placeholder.jpg")
                      }
                    />
                  </div>
                </td>

                <td className="px-4 py-3 font-medium">{row.matricula}</td>
                <td className="px-4 py-3">{row.tipo}</td>
                <td className="px-4 py-3">{row.condutor}</td>
                <td className="px-4 py-3 ca-muted">{row.entidade}</td>
                <td className="px-4 py-3">{row.entrada}</td>
                <td className="px-4 py-3">{row.saida}</td>
                <td className="px-4 py-3"><EstadoBadge estado={row.estado} /></td>

                {/* Actions */}
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="ca-icon-btn" title="Ver detalhes">
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

      {/* OffCanvas (inalterado, continua funcional) */}
      {showNewAccess && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowNewAccess(false)}
          />

          <div className="relative ml-auto h-full w-full max-w-md ca-panel shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b ca-border">
              <h2 className="text-lg font-semibold">Registar acesso de veículo</h2>
              <button onClick={() => setShowNewAccess(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="p-4 space-y-4 flex-1 overflow-y-auto ca-scroll">
              <input className="ca-input" placeholder="Matrícula do veículo" />
              <select className="ca-input">
                <option>Tipo de veículo</option>
                <option>Ligeiro</option>
                <option>Pesado</option>
                <option>Autocarro</option>
              </select>
              <input className="ca-input" placeholder="Condutor / Empresa" />
              <input type="file" className="ca-input" />
              <textarea className="ca-input" placeholder="Observações (opcional)" rows={3} />
            </form>

            <div className="p-4 border-t ca-border flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border ca-border"
                onClick={() => setShowNewAccess(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="ca-btn"
                onClick={(e) => {
                  e.preventDefault();
                  setShowNewAccess(false);
                }}
              >
                Registar acesso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

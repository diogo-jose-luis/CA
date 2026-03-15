"use client";

import { useState } from "react";
import {
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Ban,
  Plus,
  X,
} from "lucide-react";

/* =======================
   Mock data
======================= */

const stats = [
  {
    label: "Cartões Activos",
    value: 286,
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-100/60 dark:bg-green-900/20",
  },
  {
    label: "Cartões Vencidos",
    value: 34,
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-100/60 dark:bg-amber-900/20",
  },
  {
    label: "Cartões Bloqueados",
    value: 19,
    icon: Ban,
    color: "text-red-600",
    bg: "bg-red-100/60 dark:bg-red-900/20",
  },
  {
    label: "Total de Cartões",
    value: 339,
    icon: CreditCard,
    color: "text-slate-600",
    bg: "bg-slate-100/60 dark:bg-slate-800/40",
  },
];

const mockData = [
  {
    codigo: "CA-000124",
    titular: "Ana Domingos",
    tipoPessoa: "Colaboradora",
    tipoCartao: "RFID",
    emissao: "12/01/2025",
    validade: "12/01/2026",
    estado: "Activo",
  },
  {
    codigo: "CA-000130",
    titular: "Carlos Manuel",
    tipoPessoa: "Visitante",
    tipoCartao: "QR",
    emissao: "02/02/2026",
    validade: "02/02/2026",
    estado: "Vencido",
  },
  {
    codigo: "CA-000118",
    titular: "Paulo Henrique",
    tipoPessoa: "Prestador",
    tipoCartao: "RFID",
    emissao: "15/11/2025",
    validade: "15/02/2026",
    estado: "Activo",
  },
  {
    codigo: "CA-000099",
    titular: "João Miguel",
    tipoPessoa: "Visitante",
    tipoCartao: "QR",
    emissao: "28/01/2026",
    validade: "28/01/2026",
    estado: "Bloqueado",
  },
  {
    codigo: "CA-000141",
    titular: "Helena Sousa",
    tipoPessoa: "Colaboradora",
    tipoCartao: "RFID",
    emissao: "05/12/2025",
    validade: "05/12/2026",
    estado: "Activo",
  },
  {
    codigo: "CA-000152",
    titular: "António Costa",
    tipoPessoa: "Prestador",
    tipoCartao: "RFID",
    emissao: "10/01/2026",
    validade: "10/04/2026",
    estado: "Activo",
  },
];

/* =======================
   Helpers
======================= */

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    Activo:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    Vencido:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    Bloqueado:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
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
  const [showNewCard, setShowNewCard] = useState(false);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Cartões</h1>
          <p className="text-sm ca-muted">
            Gestão de cartões de acesso atribuídos a visitantes, colaboradores e prestadores.
          </p>
        </div>

        <button
          onClick={() => setShowNewCard(true)}
          className="ca-btn flex items-center gap-2"
        >
          <Plus size={18} />
          Registar novo cartão
        </button>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((item) => (
          <div key={item.label} className="ca-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm ca-muted">{item.label}</div>
                <div className="text-2xl font-semibold mt-1">
                  {item.value}
                </div>
              </div>
              <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${item.bg}`}>
                <item.icon className={item.color} size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="ca-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input className="ca-input md:col-span-2" placeholder="Pesquisar por código ou titular" />
          <select className="ca-input">
            <option>Tipo de pessoa</option>
            <option>Visitante</option>
            <option>Colaborador</option>
            <option>Prestador</option>
          </select>
          <select className="ca-input">
            <option>Tipo de cartão</option>
            <option>RFID</option>
            <option>QR</option>
            <option>Magnético</option>
          </select>
          <select className="ca-input">
            <option>Estado</option>
            <option>Activo</option>
            <option>Vencido</option>
            <option>Bloqueado</option>
          </select>
          <button className="ca-btn md:col-span-6">Aplicar filtros</button>
        </div>
      </div>

      {/* Tabela */}
      <div className="ca-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Código</th>
              <th className="px-4 py-3 text-left font-medium">Titular</th>
              <th className="px-4 py-3 text-left font-medium">Tipo de pessoa</th>
              <th className="px-4 py-3 text-left font-medium">Tipo de cartão</th>
              <th className="px-4 py-3 text-left font-medium">Emissão</th>
              <th className="px-4 py-3 text-left font-medium">Validade</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y ca-border">
            {mockData.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-medium">{row.codigo}</td>
                <td className="px-4 py-3">{row.titular}</td>
                <td className="px-4 py-3">{row.tipoPessoa}</td>
                <td className="px-4 py-3 ca-muted">{row.tipoCartao}</td>
                <td className="px-4 py-3">{row.emissao}</td>
                <td className="px-4 py-3">{row.validade}</td>
                <td className="px-4 py-3"><EstadoBadge estado={row.estado} /></td>
                <td className="px-4 py-3 text-right">
                  <button className="text-brand text-sm hover:underline">
                    Ver detalhes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* OffCanvas */}
      {showNewCard && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowNewCard(false)}
          />

          <div className="relative ml-auto h-full w-full max-w-md ca-panel shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b ca-border">
              <h2 className="text-lg font-semibold">Registar novo cartão</h2>
              <button onClick={() => setShowNewCard(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="p-4 space-y-4 flex-1 overflow-y-auto ca-scroll">
              <input className="ca-input" placeholder="Código do cartão" />
              <input className="ca-input" placeholder="Titular do cartão" />
              <select className="ca-input">
                <option>Tipo de pessoa</option>
                <option>Visitante</option>
                <option>Colaborador</option>
                <option>Prestador</option>
              </select>
              <select className="ca-input">
                <option>Tipo de cartão</option>
                <option>RFID</option>
                <option>QR</option>
                <option>Magnético</option>
              </select>
              <input type="date" className="ca-input" />
              <input type="date" className="ca-input" />
              <textarea
                className="ca-input"
                placeholder="Observações (opcional)"
                rows={3}
              />
            </form>

            <div className="p-4 border-t ca-border flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border ca-border"
                onClick={() => setShowNewCard(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="ca-btn"
                onClick={(e) => {
                  e.preventDefault();
                  setShowNewCard(false);
                }}
              >
                Registar cartão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

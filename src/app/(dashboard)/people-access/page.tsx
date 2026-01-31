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
    destino: "Moradia B12",
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
    destino: "Bloco C · Apt 3",
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
    destino: "Moradia A07",
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
  const map: Record<string, string> = {
    "No interior":
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    Saiu: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
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
          <h1 className="text-xl md:text-2xl font-semibold">Acesso de Pessoas</h1>
          <p className="text-sm ca-muted">
            Registo e controlo de entradas e saídas, incluindo o destino dentro do recinto.
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

      {/* Filtros */}
      <div className="ca-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          <input className="ca-input md:col-span-2" placeholder="Nome ou documento" />
          <input className="ca-input" placeholder="Destino" />
          <select className="ca-input">
            <option>Tipo</option>
            <option>Visitante</option>
            <option>Colaborador</option>
            <option>Prestador</option>
          </select>
          <select className="ca-input">
            <option>Estado</option>
            <option>No interior</option>
            <option>Saiu</option>
            <option>Atrasado</option>
          </select>
          <input type="date" className="ca-input" />
          <input type="date" className="ca-input" />
          <button className="ca-btn md:col-span-7">Aplicar filtros</button>
        </div>
      </div>

      {/* Tabela */}
      <div className="ca-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/40">
            <tr>
              <th className="px-4 py-3">Pessoa</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Destino</th>
              <th className="px-4 py-3">Entrada</th>
              <th className="px-4 py-3">Saída</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y ca-border">
            {mockData.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3">
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    {row.foto ? (
                      <img src={row.foto} alt={row.nome} className="h-full w-full object-cover" />
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
                    <button className="ca-icon-btn"><Eye size={16} /></button>
                    <button className="ca-icon-btn"><Pencil size={16} /></button>
                    <button className="ca-icon-btn text-red-600"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* OffCanvas */}
      {showNewAccess && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowNewAccess(false)} />
          <div className="relative ml-auto h-full w-full max-w-md ca-panel flex flex-col">
            <div className="p-4 border-b ca-border flex justify-between">
              <h2 className="font-semibold">Registar novo acesso</h2>
              <button onClick={() => setShowNewAccess(false)}><X size={20} /></button>
            </div>

            <form className="p-4 space-y-4 flex-1 overflow-y-auto">
              <input className="ca-input" placeholder="Nome completo" />
              <select className="ca-input">
                <option>Tipo de pessoa</option>
                <option>Visitante</option>
                <option>Colaborador</option>
                <option>Prestador</option>
              </select>
              <input className="ca-input" placeholder="Documento / Identificação" />
              <input className="ca-input" placeholder="Destino (moradia / sector)" />
              <input type="time" className="ca-input" />
              <textarea className="ca-input" placeholder="Observações" rows={3} />
            </form>

            <div className="p-4 border-t ca-border flex justify-end gap-2">
              <button className="px-4 py-2 border rounded-xl" onClick={() => setShowNewAccess(false)}>
                Cancelar
              </button>
              <button className="ca-btn">Registar acesso</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

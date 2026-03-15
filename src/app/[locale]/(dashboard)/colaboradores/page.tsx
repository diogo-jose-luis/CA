"use client";

import { useState } from "react";
import {
  Users,
  Briefcase,
  Building2,
  CheckCircle,
  XCircle,
  Plus,
  X,
  Eye,
  Pencil,
  Trash2,
  User,
} from "lucide-react";

/* =======================
   Stats
======================= */

const stats = [
  {
    label: "Total de Colaboradores",
    value: 5,
    icon: Users,
    color: "text-blue-600",
    bg: "bg-blue-100/60 dark:bg-blue-900/20",
  },
  {
    label: "Ativos",
    value: 4,
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-100/60 dark:bg-green-900/20",
  },
  {
    label: "Inativos",
    value: 1,
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-100/60 dark:bg-red-900/20",
  },
];

/* =======================
   Mock Data
======================= */

const mockData = [
  {
    id: 1,
    foto: "/people/stiviandra2.jpg",
    nome: "Stiviandra Oliveira",
    position: "Administradora",
    departamento: "Administração",
    estado: "Ativo",
  },
  {
    id: 2,
    foto: "/people/IMG_1063.jpg",
    nome: "António Jamba",
    position: "Supervisor de Segurança",
    departamento: "Segurança",
    estado: "Ativo",
  },
  {
    id: 3,
    foto: "/people/IMG_9732.jpg",
    nome: "Paulo Henrique",
    position: "Técnico de Manutenção",
    departamento: "Manutenção",
    estado: "Inativo",
  },
  {
    id: 4,
    foto: "/people/oliveira2.jpg",
    nome: "João Miguel",
    position: "Assistente Operacional",
    departamento: "Operações",
    estado: "Ativo",
  },
  {
    id: 5,
    foto: "/people/marlene2.jpg",
    nome: "Helena Sousa",
    position: "Gestora de RH",
    departamento: "Recursos Humanos",
    estado: "Ativo",
  },
];

/* =======================
   Badge
======================= */

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    Ativo:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    Inativo:
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
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">
            Colaboradores
          </h1>
          <p className="text-sm ca-muted">
            Gestão de colaboradores do condomínio ou organização.
          </p>
        </div>

        <button
          onClick={() => setShowNew(true)}
          className="ca-btn flex items-center gap-2"
        >
          <Plus size={18} />
          Novo colaborador
        </button>
      </div>

      {/* Stats */}
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
              <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${item.bg}`}>
                <item.icon className={item.color} size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="ca-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="ca-input"
            placeholder="Pesquisar por nome"
          />
          <input
            className="ca-input"
            placeholder="Pesquisar por departamento"
          />
          <select className="ca-input">
            <option>Estado</option>
            <option>Ativo</option>
            <option>Inativo</option>
          </select>
          <button className="ca-btn md:col-span-4">
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
              <th className="px-4 py-3 text-left font-medium">Foto</th>
              <th className="px-4 py-3 text-left font-medium">Nome</th>
              <th className="px-4 py-3 text-left font-medium">Posição</th>
              <th className="px-4 py-3 text-left font-medium">Departamento</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y ca-border">
            {mockData.map((row, index) => (
              <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">

                <td className="px-4 py-3 font-medium">
                  {index + 1}
                </td>

                <td className="px-4 py-3">
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    {row.foto ? (
                      <img
                        src={row.foto}
                        alt={row.nome}
                        className="h-full w-full object-cover"
                        onError={(e) =>
                          ((e.target as HTMLImageElement).src =
                            "/people/placeholder.jpg")
                        }
                      />
                    ) : (
                      <User size={18} />
                    )}
                  </div>
                </td>

                <td className="px-4 py-3 font-medium">
                  {row.nome}
                </td>

                <td className="px-4 py-3">
                  {row.position}
                </td>

                <td className="px-4 py-3">
                  {row.departamento}
                </td>

                <td className="px-4 py-3">
                  <EstadoBadge estado={row.estado} />
                </td>

                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="ca-icon-btn" title="Ver detalhes">
                      <Eye size={16} />
                    </button>
                    <button className="ca-icon-btn" title="Editar">
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

      {/* Modal Novo Colaborador */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowNew(false)}
          />
          <div className="relative ml-auto h-full w-full max-w-md ca-panel shadow-2xl flex flex-col">

            <div className="flex items-center justify-between p-4 border-b ca-border">
              <h2 className="text-lg font-semibold">
                Novo colaborador
              </h2>
              <button onClick={() => setShowNew(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="p-4 space-y-4 flex-1 overflow-y-auto ca-scroll">
              <input className="ca-input" placeholder="Nome completo" />
              <input className="ca-input" placeholder="Posição / Cargo" />
              <input className="ca-input" placeholder="Departamento" />
              <select className="ca-input">
                <option>Estado</option>
                <option>Ativo</option>
                <option>Inativo</option>
              </select>
              <input type="file" className="ca-input" />
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
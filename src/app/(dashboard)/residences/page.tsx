"use client";

import { useState } from "react";
import {
  Home,
  Users,
  Plus,
  X,
  Eye,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Phone,
  User,
} from "lucide-react";

/* =======================
   Mock data
======================= */

const stats = [
  {
    label: "Total de Moradias",
    value: 128,
    icon: Home,
    color: "text-blue-600",
    bg: "bg-blue-100/60 dark:bg-blue-900/20",
  },
  {
    label: "Moradias Ocupadas",
    value: 97,
    icon: Users,
    color: "text-green-600",
    bg: "bg-green-100/60 dark:bg-green-900/20",
  },
  {
    label: "Moradias Livres",
    value: 31,
    icon: Home,
    color: "text-slate-600",
    bg: "bg-slate-100/60 dark:bg-slate-800/40",
  },
];

const mockData = [
  {
    imagem: "/houses/image.jpg",
    codigo: "A-12",
    bloco: "Bloco A",
    proprietario: "Carlos Manuel",
    ocupantes: 4,
    estado: "Ocupada",
    moradores: [
      { nome: "Carlos Manuel", tipo: "adulto", telefone: "923 456 789" },
      { nome: "Ana Manuel", tipo: "adulto", telefone: "934 112 220" },
      { nome: "Lucas Manuel", tipo: "crianca" },
      { nome: "Inês Manuel", tipo: "crianca" },
    ],
  },
  {
    imagem: "/houses/image.jpg",
    codigo: "B-03",
    bloco: "Bloco B",
    proprietario: "Ana Domingos",
    ocupantes: 2,
    estado: "Ocupada",
    moradores: [
      { nome: "Ana Domingos", tipo: "adulto", telefone: "922 888 001" },
      { nome: "Paulo Domingos", tipo: "adulto", telefone: "933 220 455" },
    ],
  },
  {
    imagem: "/houses/image.jpg",
    codigo: "C-07",
    bloco: "Bloco C",
    proprietario: "--",
    ocupantes: 0,
    estado: "Livre",
    moradores: [],
  },
];

/* =======================
   Helpers
======================= */

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    Ocupada:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    Livre:
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
  const [showDetails, setShowDetails] = useState<any>(null);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Moradias</h1>
          <p className="text-sm ca-muted">
            Gestão de moradias, proprietários e ocupação do condomínio.
          </p>
        </div>

        <button
          onClick={() => setShowNew(true)}
          className="ca-btn flex items-center gap-2"
        >
          <Plus size={18} />
          Nova moradia
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
              <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${item.bg}`}>
                <item.icon className={item.color} size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="ca-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            className="ca-input"
            placeholder="Pesquisar por código ou proprietário"
          />
          <select className="ca-input">
            <option>Bloco</option>
            <option>Bloco A</option>
            <option>Bloco B</option>
            <option>Bloco C</option>
          </select>
          <select className="ca-input">
            <option>Estado</option>
            <option>Ocupada</option>
            <option>Livre</option>
          </select>
          <select className="ca-input">
            <option>Nº de ocupantes</option>
            <option>0</option>
            <option>1–2</option>
            <option>3–4</option>
            <option>5+</option>
          </select>
          <button className="ca-btn md:col-span-5">
            Aplicar filtros
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="ca-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/40">
            <tr>
              <th className="px-4 py-3">Moradia</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Bloco</th>
              <th className="px-4 py-3">Proprietário</th>
              <th className="px-4 py-3">Ocupantes</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y ca-border">
            {mockData.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3">
                  <div className="h-12 w-16 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    {row.imagem ? (
                      <img
                        src={row.imagem}
                        alt="Moradia"
                        className="h-full w-full object-cover"
                        onError={(e) =>
                          ((e.target as HTMLImageElement).src =
                            "/houses/placeholder.jpg")
                        }
                      />
                    ) : (
                      <ImageIcon size={18} />
                    )}
                  </div>
                </td>

                <td className="px-4 py-3 font-medium">{row.codigo}</td>
                <td className="px-4 py-3">{row.bloco}</td>
                <td className="px-4 py-3">{row.proprietario}</td>
                <td className="px-4 py-3">{row.ocupantes}</td>
                <td className="px-4 py-3">
                  <EstadoBadge estado={row.estado} />
                </td>

                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      className="ca-icon-btn"
                      title="Ver detalhes"
                      onClick={() => setShowDetails(row)}
                    >
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

      {/* Modal – Detalhes da Moradia */}
      {showDetails && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowDetails(null)}
          />
          <div className="relative m-auto w-full max-w-lg ca-panel shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b ca-border">
              <h2 className="text-lg font-semibold">
                Moradia {showDetails.codigo}
              </h2>
              <button onClick={() => setShowDetails(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="text-sm ca-muted">
                {showDetails.bloco} · {showDetails.estado}
              </div>

              <div>
                <div className="font-medium mb-2">Moradores</div>

                {showDetails.moradores.length === 0 && (
                  <div className="text-sm ca-muted">
                    Nenhum morador registado.
                  </div>
                )}

                <div className="space-y-2">
                  {showDetails.moradores.map((m: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between border rounded-xl px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <User size={16} />
                        <span>{m.nome}</span>
                        {m.tipo === "crianca" && (
                          <span className="text-xs ca-muted">(criança)</span>
                        )}
                      </div>

                      {m.tipo === "adulto" && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone size={14} />
                          {m.telefone}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t ca-border flex justify-end">
              <button
                className="px-4 py-2 rounded-xl border ca-border"
                onClick={() => setShowDetails(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal – Nova Moradia */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowNew(false)}
          />
          <div className="relative ml-auto h-full w-full max-w-md ca-panel shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b ca-border">
              <h2 className="text-lg font-semibold">Registar nova moradia</h2>
              <button onClick={() => setShowNew(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="p-4 space-y-4 flex-1 overflow-y-auto ca-scroll">
              <input className="ca-input" placeholder="Código da moradia (ex: A-12)" />
              <input className="ca-input" placeholder="Bloco" />
              <input className="ca-input" placeholder="Proprietário (opcional)" />
              <input type="number" className="ca-input" placeholder="Número de ocupantes" />
              <input type="file" className="ca-input" />
              <textarea className="ca-input" placeholder="Observações (opcional)" rows={3} />
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
                Registar moradia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

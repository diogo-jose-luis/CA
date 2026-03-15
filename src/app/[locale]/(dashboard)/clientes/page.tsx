"use client";

import { useState } from "react";
import {
  Building2,
  Users,
  Mail,
  Phone,
  Globe,
  Plus,
  X,
  Eye,
  Pencil,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";

/* =======================
   Stats
======================= */

const stats = [
  {
    label: "Total de Clientes",
    value: 3,
    icon: Users,
    color: "text-blue-600",
    bg: "bg-blue-100/60 dark:bg-blue-900/20",
  },
  {
    label: "Clientes Corporativos",
    value: 2,
    icon: Building2,
    color: "text-green-600",
    bg: "bg-green-100/60 dark:bg-green-900/20",
  },
  {
    label: "Clientes Particulares",
    value: 1,
    icon: Users,
    color: "text-slate-600",
    bg: "bg-slate-100/60 dark:bg-slate-800/40",
  },
];

/* =======================
   Mock Data
======================= */

const mockData = [
  {
    id: 1,
    logotipo: "/organizacao/logo-kurla.png",
    nome: "Condomínio Atlântico",
    area: "Residencial Premium",
    email: "contacto@atlantico.ao",
    telefone: "+244 923 000 101",
    site: "www.atlantico.ao",
  },
  {
    id: 2,
    logotipo: "/organizacao/ponticelli.png",
    nome: "MetalSul Holdings",
    area: "Industrial",
    email: "geral@metalsul.co.ao",
    telefone: "+244 923 000 102",
    site: "www.metalsul.co.ao",
  },
  {
    id: 3,
    logotipo: "/organizacao/sistec sa.png",
    nome: "Jardim Verde Residence",
    area: "Residencial",
    email: "info@jardimverde.ao",
    telefone: "+244 923 000 103",
    site: "www.jardimverde.ao",
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
            Clientes
          </h1>
          <p className="text-sm ca-muted">
            Gestão de clientes associados à organização.
          </p>
        </div>

        <button
          onClick={() => setShowNew(true)}
          className="ca-btn flex items-center gap-2"
        >
          <Plus size={18} />
          Novo cliente
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
            placeholder="Área / Segmento"
          />
          <input
            className="ca-input"
            placeholder="E-mail"
          />
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
              <th className="px-4 py-3 text-left font-medium">Logotipo</th>
              <th className="px-4 py-3 text-left font-medium">Nome</th>
              <th className="px-4 py-3 text-left font-medium">Área</th>
              <th className="px-4 py-3 text-left font-medium">E-mail</th>
              <th className="px-4 py-3 text-left font-medium">Telefone</th>
              <th className="px-4 py-3 text-left font-medium">Site</th>
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
                  <div className="h-12 w-16 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    {row.logotipo ? (
                      <img
                        src={row.logotipo}
                        alt={row.nome}
                        className="h-full w-full object-contain"
                        onError={(e) =>
                          ((e.target as HTMLImageElement).src =
                            "/organizacao/placeholder.png")
                        }
                      />
                    ) : (
                      <ImageIcon size={18} />
                    )}
                  </div>
                </td>

                <td className="px-4 py-3 font-medium">
                  {row.nome}
                </td>

                <td className="px-4 py-3">
                  {row.area}
                </td>

                <td className="px-4 py-3 ca-muted">
                  {row.email}
                </td>

                <td className="px-4 py-3">
                  {row.telefone}
                </td>

                <td className="px-4 py-3 text-blue-600">
                  {row.site}
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

      {/* Modal Novo Cliente */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowNew(false)}
          />
          <div className="relative ml-auto h-full w-full max-w-md ca-panel shadow-2xl flex flex-col">

            <div className="flex items-center justify-between p-4 border-b ca-border">
              <h2 className="text-lg font-semibold">
                Novo cliente
              </h2>
              <button onClick={() => setShowNew(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="p-4 space-y-4 flex-1 overflow-y-auto ca-scroll">
              <input className="ca-input" placeholder="Nome da empresa" />
              <input className="ca-input" placeholder="Área / Segmento" />
              <input className="ca-input" placeholder="E-mail" />
              <input className="ca-input" placeholder="Telefone" />
              <input className="ca-input" placeholder="Website" />
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
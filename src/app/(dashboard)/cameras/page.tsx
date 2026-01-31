"use client";

import { useState } from "react";
import {
  Video,
  Wifi,
  WifiOff,
  Settings,
  Plus,
  X,
  Eye,
  Pencil,
  Trash2,
  MapPin,
} from "lucide-react";

/* =======================
   Mock data
======================= */

const stats = [
  {
    label: "Câmeras Activas",
    value: 18,
    icon: Wifi,
    color: "text-green-600",
    bg: "bg-green-100/60 dark:bg-green-900/20",
  },
  {
    label: "Câmeras Offline",
    value: 3,
    icon: WifiOff,
    color: "text-red-600",
    bg: "bg-red-100/60 dark:bg-red-900/20",
  },
  {
    label: "Em Manutenção",
    value: 2,
    icon: Settings,
    color: "text-amber-600",
    bg: "bg-amber-100/60 dark:bg-amber-900/20",
  },
  {
    label: "Total de Câmeras",
    value: 23,
    icon: Video,
    color: "text-slate-600",
    bg: "bg-slate-100/60 dark:bg-slate-800/40",
  },
];

const mockData = [
  {
    imagem: "/cameras/cam-1.jpg",
    nome: "Portaria Principal",
    zona: "Entrada Principal",
    tipo: "Dome",
    estado: "Online",
  },
  {
    imagem: "/cameras/cam-2.jpg",
    nome: "Bloco A - Norte",
    zona: "Bloco A",
    tipo: "Bullet",
    estado: "Online",
  },
  {
    imagem: "/cameras/cam-3.jpg",
    nome: "Estacionamento",
    zona: "Parque Auto",
    tipo: "PTZ",
    estado: "Offline",
  },
  {
    imagem: "/cameras/cam-4.jpg",
    nome: "Entrada de Serviço",
    zona: "Área Técnica",
    tipo: "Bullet",
    estado: "Manutenção",
  },
  {
    imagem: "/cameras/cam-5.jpg",
    nome: "Bloco C - Sul",
    zona: "Bloco C",
    tipo: "Dome",
    estado: "Online",
  },
];

/* =======================
   Helpers
======================= */

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    Online: "bg-green-600",
    Offline: "bg-red-600",
    Manutenção: "bg-amber-500",
  };

  return (
    <span className="flex items-center gap-1 text-xs font-medium">
      <span className={`h-2 w-2 rounded-full ${map[estado]}`} />
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
          <h1 className="text-xl md:text-2xl font-semibold">Câmeras</h1>
          <p className="text-sm ca-muted">
            Monitorização e gestão do sistema de videovigilância (CFTV).
          </p>
        </div>

        <button
          onClick={() => setShowNew(true)}
          className="ca-btn flex items-center gap-2"
        >
          <Plus size={18} />
          Nova câmara
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input className="ca-input" placeholder="Pesquisar por nome ou zona" />
          <select className="ca-input">
            <option>Zona</option>
            <option>Entrada Principal</option>
            <option>Bloco A</option>
            <option>Bloco B</option>
            <option>Estacionamento</option>
          </select>
          <select className="ca-input">
            <option>Tipo</option>
            <option>Dome</option>
            <option>Bullet</option>
            <option>PTZ</option>
          </select>
          <select className="ca-input">
            <option>Estado</option>
            <option>Online</option>
            <option>Offline</option>
            <option>Manutenção</option>
          </select>
          <button className="ca-btn md:col-span-5">Aplicar filtros</button>
        </div>
      </div>

      {/* GRID DE CÂMERAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {mockData.map((cam, idx) => (
          <div key={idx} className="ca-card overflow-hidden">
            {/* Thumbnail */}
            <div className="relative h-44 bg-slate-200 dark:bg-slate-700">
              <img
                src={cam.imagem}
                alt={cam.nome}
                className="h-full w-full object-cover"
                onError={(e) =>
                  ((e.target as HTMLImageElement).src =
                    "/cameras/placeholder.jpg")
                }
              />

              <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                {cam.tipo}
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">{cam.nome}</div>
                <EstadoBadge estado={cam.estado} />
              </div>

              <div className="flex items-center gap-1 text-xs ca-muted">
                <MapPin size={14} />
                {cam.zona}
              </div>

              {/* Ações */}
              <div className="flex justify-end gap-2 pt-2">
                <button className="ca-icon-btn" title="Visualizar">
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
            </div>
          </div>
        ))}
      </div>

      {/* OffCanvas / Nova Câmara */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowNew(false)}
          />
          <div className="relative ml-auto h-full w-full max-w-md ca-panel shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b ca-border">
              <h2 className="text-lg font-semibold">Registar nova câmara</h2>
              <button onClick={() => setShowNew(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="p-4 space-y-4 flex-1 overflow-y-auto ca-scroll">
              <input className="ca-input" placeholder="Nome da câmara" />
              <input className="ca-input" placeholder="Zona / Localização" />
              <select className="ca-input">
                <option>Tipo de câmara</option>
                <option>Dome</option>
                <option>Bullet</option>
                <option>PTZ</option>
              </select>
              <select className="ca-input">
                <option>Estado inicial</option>
                <option>Online</option>
                <option>Offline</option>
                <option>Manutenção</option>
              </select>
              <input type="file" className="ca-input" />
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
                Registar câmara
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

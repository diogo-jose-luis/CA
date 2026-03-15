"use client";

import { useState } from "react";
import {
  Building,
  Clock,
  Bell,
  Palette,
  Shield,
  Save,
} from "lucide-react";

export default function Page() {
  const [loading, setLoading] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 1200);
  }

  return (
    <form
      onSubmit={handleSave}
      className="p-4 md:p-6 space-y-6 max-w-5xl"
    >
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-semibold">Configurações</h1>
        <p className="text-sm ca-muted">
          Definições gerais do sistema de controlo de acesso.
        </p>
      </div>

      {/* =====================
          Dados do Condomínio
      ===================== */}
      <div className="ca-card p-5 space-y-4">
        <div className="flex items-center gap-2 font-medium">
          <Building size={18} />
          Dados do condomínio
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="ca-input" placeholder="Nome do condomínio / instalação" />
          <input className="ca-input" placeholder="Endereço" />
          <input className="ca-input" placeholder="Telefone de contacto" />
          <input className="ca-input" placeholder="E-mail institucional" />
        </div>
      </div>

      {/* =====================
          Regras de Acesso
      ===================== */}
      <div className="ca-card p-5 space-y-4">
        <div className="flex items-center gap-2 font-medium">
          <Shield size={18} />
          Regras de acesso
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select className="ca-input">
            <option>Tipo de controlo de acesso</option>
            <option>24 horas</option>
            <option>Horário definido</option>
          </select>

          <select className="ca-input">
            <option>Obrigatoriedade de registo de saída</option>
            <option>Sim</option>
            <option>Não</option>
          </select>

          <select className="ca-input">
            <option>Permitir acesso sem cartão</option>
            <option>Não</option>
            <option>Sim</option>
          </select>

          <select className="ca-input">
            <option>Nível de validação</option>
            <option>Portaria</option>
            <option>Gestão</option>
            <option>Automático</option>
          </select>
        </div>
      </div>

      {/* =====================
          Horários
      ===================== */}
      <div className="ca-card p-5 space-y-4">
        <div className="flex items-center gap-2 font-medium">
          <Clock size={18} />
          Horários operacionais
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="time" className="ca-input" />
          <input type="time" className="ca-input" />
          <select className="ca-input">
            <option>Dias de funcionamento</option>
            <option>Segunda a Sexta</option>
            <option>Todos os dias</option>
          </select>
        </div>
      </div>

      {/* =====================
          Notificações
      ===================== */}
      <div className="ca-card p-5 space-y-4">
        <div className="flex items-center gap-2 font-medium">
          <Bell size={18} />
          Notificações
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm">Avisar quando um acesso for negado</span>
            <input type="checkbox" className="h-4 w-4" />
          </label>

          <label className="flex items-center justify-between">
            <span className="text-sm">Avisar acessos fora do horário</span>
            <input type="checkbox" className="h-4 w-4" />
          </label>

          <label className="flex items-center justify-between">
            <span className="text-sm">Avisar câmara offline</span>
            <input type="checkbox" className="h-4 w-4" />
          </label>
        </div>
      </div>

      {/* =====================
          Aparência
      ===================== */}
      <div className="ca-card p-5 space-y-4">
        <div className="flex items-center gap-2 font-medium">
          <Palette size={18} />
          Aparência
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select className="ca-input">
            <option>Tema padrão</option>
            <option>Claro</option>
            <option>Escuro</option>
            <option>Sistema</option>
          </select>

          <input type="file" className="ca-input" />
        </div>

        <p className="text-xs ca-muted">
          Upload do logótipo do condomínio ou empresa (opcional).
        </p>
      </div>

      {/* =====================
          Guardar
      ===================== */}
      <div className="flex justify-end">
        <button
          type="submit"
          className="ca-btn flex items-center gap-2"
          disabled={loading}
        >
          <Save size={16} />
          {loading ? "A guardar..." : "Guardar alterações"}
        </button>
      </div>
    </form>
  );
}

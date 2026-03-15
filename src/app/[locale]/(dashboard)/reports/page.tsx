"use client";

import { useState } from "react";
import {
  FileText,
  Users,
  Car,
  Home,
  Bell,
  Download,
  FileSpreadsheet,
  Eye,
  Calendar,
} from "lucide-react";
import { useTranslations } from "next-intl";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* =======================
   Mock data
======================= */

const stats = [
  {
    label: "generatedMonth",
    value: 42,
    icon: FileText,
    color: "text-blue-600",
    bg: "bg-blue-100/60 dark:bg-blue-900/20",
  },
  {
    label: "accessReports",
    value: 21,
    icon: Users,
    color: "text-green-600",
    bg: "bg-green-100/60 dark:bg-green-900/20",
  },
  {
    label: "vehicleReports",
    value: 13,
    icon: Car,
    color: "text-slate-600",
    bg: "bg-slate-100/60 dark:bg-slate-800/40",
  },
  {
    label: "adminReports",
    value: 8,
    icon: Home,
    color: "text-amber-600",
    bg: "bg-amber-100/60 dark:bg-amber-900/20",
  },
];

const availableReports = [
  {
    nome: "Relatório de Acesso de Pessoas",
    modulo: "Acessos",
    formatos: ["PDF", "Excel"],
  },
  {
    nome: "Relatório de Acesso de Veículos",
    modulo: "Veículos",
    formatos: ["PDF", "Excel"],
  },
  {
    nome: "Relatório de Cartões Activos",
    modulo: "Cartões",
    formatos: ["PDF"],
  },
  {
    nome: "Relatório de Moradias e Ocupação",
    modulo: "Moradias",
    formatos: ["PDF", "Excel"],
  },
  {
    nome: "Relatório de Avisos Publicados",
    modulo: "Avisos",
    formatos: ["PDF"],
  },
];

const history = [
  {
    relatorio: "Acesso de Pessoas",
    periodo: "01/02/2026 - 15/02/2026",
    formato: "PDF",
    geradoEm: "15/02/2026 10:32",
  },
  {
    relatorio: "Acesso de Veículos",
    periodo: "01/02/2026 - 10/02/2026",
    formato: "Excel",
    geradoEm: "10/02/2026 08:14",
  },
  {
    relatorio: "Moradias e Ocupação",
    periodo: "01/01/2026 - 31/01/2026",
    formato: "PDF",
    geradoEm: "02/02/2026 16:45",
  },
];

const peopleAccessData = [
  ["João Manuel", "Funcionário", "Entrada", "12/02/2026 08:12"],
  ["Maria Pedro", "Visitante", "Entrada", "12/02/2026 09:04"],
  ["Carlos Silva", "Fornecedor", "Saída", "12/02/2026 10:21"],
  ["Ana Costa", "Funcionária", "Entrada", "12/02/2026 11:11"],
  ["Pedro Gomes", "Visitante", "Saída", "12/02/2026 12:30"],
];

const vehicleAccessData = [
  ["LD-45-23-AA", "Toyota Hilux", "Entrada", "12/02/2026 07:50"],
  ["LD-22-88-BB", "Kia Sportage", "Entrada", "12/02/2026 08:32"],
  ["LD-99-32-CC", "Hyundai i10", "Saída", "12/02/2026 09:40"],
  ["LD-77-55-DD", "Isuzu DMAX", "Entrada", "12/02/2026 10:14"],
  ["LD-66-11-EE", "Toyota Prado", "Saída", "12/02/2026 11:03"],
];

const noticesData = [
  ["Interrupção de água", "Manutenção", "Alta", "12/02/2026"],
  ["Assembleia geral", "Reunião", "Normal", "10/02/2026"],
  ["Horário portaria", "Informação", "Normal", "08/02/2026"],
  ["Manutenção elevadores", "Manutenção", "Alta", "05/02/2026"],
  ["Recolha de lixo", "Informação", "Normal", "01/02/2026"],
];

/* =======================
   Page
======================= */

export default function Page() {
  const t = useTranslations("reports");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function createReport(title: string, columns: string[], rows: any[]) {
    const doc = new jsPDF();

    const exportedBy = "Diogo Luís"; // depois pode vir da sessão
    const exportDate = new Date().toLocaleString();

    const orgName = "";
    const logo = "/organizacao/ponticelli.png"; // colocar logo real se existir

    doc.addImage(logo, "PNG", 15, 10, 20, 20);

    doc.setFontSize(16);
    doc.text(orgName, 40, 18);

    doc.setFontSize(12);
    doc.text(title, 15, 40);

    const period = from && to ? `${from} - ${to}` : "01/02/2026 - 15/02/2026";

    doc.text(`Período: ${period}`, 15, 48);

    doc.line(15, 52, 195, 52);

    autoTable(doc, {
      startY: 60,
      head: [columns],
      body: rows,

      didDrawPage: (data) => {
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;

        doc.setFontSize(9);

        // linha separadora
        doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);

        // texto esquerda
        doc.text(`Exportado por: ${exportedBy}`, 15, pageHeight - 8);

        // texto direita
        doc.text(
          `Data de exportação: ${exportDate}`,
          pageWidth - 15,
          pageHeight - 8,
          { align: "right" },
        );

        const pageNumber = doc.getCurrentPageInfo().pageNumber;

        doc.text(`Página ${pageNumber}`, pageWidth / 2, pageHeight - 8, {
          align: "center",
        });
      },
    });

    doc.save(`${title}.pdf`);
  }

  function exportPeopleAccess() {
    createReport(
      "Relatório de Acesso de Pessoas",
      ["Nome", "Tipo", "Movimento", "Data"],
      peopleAccessData,
    );
  }

  function exportVehicleAccess() {
    createReport(
      "Relatório de Acesso de Veículos",
      ["Matrícula", "Veículo", "Movimento", "Data"],
      vehicleAccessData,
    );
  }

  function exportNotices() {
    createReport(
      "Relatório de Avisos Publicados",
      ["Título", "Categoria", "Prioridade", "Data"],
      noticesData,
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-semibold">{t("title")}</h1>

        <p className="text-sm ca-muted">{t("subtitle")}</p>
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
              <div
                className={`h-11 w-11 rounded-2xl flex items-center justify-center ${item.bg}`}
              >
                <item.icon className={item.color} size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros globais */}
      <div className="ca-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select className="ca-input">
            <option>{t("filters.reportType")}</option>
            <option>{t("modules.access")}</option>
            <option>{t("modules.vehicles")}</option>
            <option>{t("modules.cards")}</option>
            <option>{t("modules.residences")}</option>
            <option>{t("modules.notices")}</option>
          </select>

          <div className="relative">
            <Calendar
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60"
            />
            <input
              type="date"
              className="ca-input pl-9"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div className="relative">
            <Calendar
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60"
            />
            <input
              type="date"
              className="ca-input pl-9"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <button className="ca-btn md:col-span-5">{t("filters.apply")}</button>
        </div>
      </div>

      {/* Relatórios disponíveis */}
      <div className="ca-card">
        <div className="p-4 border-b ca-border font-medium">
          {t("available")}
        </div>

        <div className="divide-y ca-border">
          {availableReports.map((rep, idx) => (
            <div
              key={idx}
              className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
            >
              <div>
                <div className="font-medium">{rep.nome}</div>
                <div className="text-xs ca-muted">
                  {t("module")}: {rep.modulo}
                </div>
              </div>

              <div className="flex gap-2">
                {rep.formatos.includes("PDF") && (
                  <button
                    className="ca-icon-btn"
                    title={t("actions.generatePDF")}
                    onClick={() => {
                      if (rep.nome === "Relatório de Acesso de Pessoas") {
                        exportPeopleAccess();
                      }

                      if (rep.nome === "Relatório de Acesso de Veículos") {
                        exportVehicleAccess();
                      }

                      if (rep.nome === "Relatório de Avisos Publicados") {
                        exportNotices();
                      }
                    }}
                  >
                    <Download size={16} />
                  </button>
                )}
                {rep.formatos.includes("Excel") && (
                  <button
                    className="ca-icon-btn"
                    title={t("actions.generateExcel")}
                  >
                    <FileSpreadsheet size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Histórico */}
      <div className="ca-card overflow-hidden">
        <div className="p-4 border-b ca-border font-medium">
          <div className="p-4 border-b ca-border font-medium">
            {t("history.title")}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/40">
            <tr>
              <th>{t("history.report")}</th>
              <th>{t("history.period")}</th>
              <th>{t("history.format")}</th>
              <th>{t("history.generated")}</th>
              <th className="text-right">{t("history.actions")}</th>
            </tr>
          </thead>

          <tbody className="divide-y ca-border">
            {history.map((row, idx) => (
              <tr
                key={idx}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
              >
                <td className="px-4 py-3 font-medium">{row.relatorio}</td>
                <td className="px-4 py-3">{row.periodo}</td>
                <td className="px-4 py-3">{row.formato}</td>
                <td className="px-4 py-3">{row.geradoEm}</td>
                <td className="px-4 py-3 text-right">
                  <button className="ca-icon-btn" title={t("actions.view")}>
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

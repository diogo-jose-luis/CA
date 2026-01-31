import DashboardCards from "@/components/dashboard/DashboardCards";

export default function DashboardPage() {
  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm ca-muted">Indicadores de portaria e segurança patrimonial.</p>
      </div>

      <DashboardCards />
    </div>
  );
}

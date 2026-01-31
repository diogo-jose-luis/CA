import { Construction } from "lucide-react";

export default function ComingSoon() {
  return (
    <div className="ca-card p-6">
      <div className="flex items-center gap-3">
        <div
          className="h-11 w-11 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(135,55,70,0.14)", color: "var(--brand)" }}
        >
          <Construction size={18} />
        </div>

        <div>
          <div className="font-semibold">Em construção</div>
          <div className="text-sm ca-muted">
            Esta página já está estruturada no menu; agora só falta ligares a API e os formulários.
          </div>
        </div>
      </div>
    </div>
  );
}

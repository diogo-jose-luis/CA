export default function Footer() {
  return (
    <footer className="h-12 border-t ca-border ca-panel flex items-center px-4 text-xs ca-muted">
      © {new Date().getFullYear()} CA · Controle de Acesso
    </footer>
  );
}

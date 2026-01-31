export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/banners/background.png')",
        }}
      />

      {/* Overlay profissional (escuro + brand subtle) */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Brand tint overlay (muito subtil) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(135,55,70,0.35), rgba(0,0,0,0.75))",
        }}
      />

      {/* Conteúdo */}
      <div className="relative z-10 w-full flex justify-center px-4">
        {children}
      </div>
    </div>
  );
}

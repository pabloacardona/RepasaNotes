import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "./auth-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { SocratesLogo } from "@/components/socrates-logo";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Entra a Repasa o crea tu cuenta gratis.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { tab } = await searchParams;
  const initial = tab === "registro" ? "register" : "login";

  return (
    <main className="hx relative flex flex-1 items-center justify-center p-4 sm:p-8">
      <div className="hx-bg" aria-hidden />
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="hx-panel grid w-full max-w-4xl overflow-hidden md:grid-cols-[1fr_1.15fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#1d1826] via-[#2f2820] to-[#7a5d22] p-10 text-white md:flex md:gap-10">
          <div aria-hidden className="absolute -left-16 -top-16 h-72 w-72 rounded-full bg-[radial-gradient(circle,#f0c85a40_0%,transparent_68%)]" />
          <Link href="/" className="relative flex items-center gap-4" aria-label="Repasa, inicio">
            <SocratesLogo size={72} />
            <span className="hx-yellow font-display text-3xl font-bold">Repasa</span>
          </Link>
          <div className="relative">
            <p className="font-display text-3xl font-bold leading-snug">Tus apuntes, convertidos en práctica.</p>
            <p className="mt-3 text-white/70">¿Muchos temas por repasar? Empieza por el más flojo.</p>
          </div>
          <div aria-hidden className="relative h-px w-full bg-gradient-to-r from-[#f0c85a]/60 to-transparent" />
        </aside>
        <div className="p-6 sm:p-8">
          <Link href="/" className="hx-yellow mb-6 flex items-center justify-center gap-3 font-display text-3xl font-bold md:hidden">
            <SocratesLogo size={52} />
            Repasa
          </Link>
          <AuthForm initial={initial} />
        </div>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "./auth-form";
import { ThemeToggle } from "@/components/theme-toggle";

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
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-[var(--blue)] p-8 text-white md:flex">
          <Link href="/" className="relative font-display text-3xl font-bold">
            Repasa
          </Link>
          <div>
            <p className="font-display text-3xl font-bold leading-snug">
              Tus apuntes, convertidos en práctica.
            </p>
            <div className="mt-4 h-2 w-24 bg-[var(--accent)]" />
          </div>
          <p className="relative text-white/80">¿Muchos temas por repasar? Empieza por el más flojo.</p>
        </aside>
        <div className="p-6 sm:p-8">
          <Link href="/" className="mb-6 block font-display text-2xl font-bold text-ink md:hidden">
            Repasa
          </Link>
          <AuthForm initial={initial} />
        </div>
      </div>
    </main>
  );
}

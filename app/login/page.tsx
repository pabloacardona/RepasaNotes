import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Entra a Repasa o crea tu cuenta gratis.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { tab } = await searchParams;
  const initial = tab === "registro" ? "register" : "login";

  return (
    <main className="flex flex-1 items-center justify-center p-4 sm:p-8">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-line bg-card shadow-xl md:grid-cols-[1fr_1.15fr]">
        <aside className="hidden flex-col justify-between bg-ink p-8 text-white md:flex">
          <Link href="/" className="font-display text-3xl font-bold text-yellow">
            Repasa
          </Link>
          <div>
            <p className="font-display text-3xl font-bold leading-snug">
              Tus apuntes, convertidos en práctica.
            </p>
            <div className="mt-4 h-1.5 w-24 rounded-full bg-yellow" />
          </div>
          <p className="text-white/75">¿Muchos temas por repasar? Empieza por el más flojo.</p>
        </aside>
        <div className="bg-paper p-6 sm:p-8">
          <Link href="/" className="mb-6 block font-display text-2xl font-bold text-ink md:hidden">
            Repasa
          </Link>
          <AuthForm initial={initial} />
        </div>
      </div>
    </main>
  );
}

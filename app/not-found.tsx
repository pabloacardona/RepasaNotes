import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="font-display text-6xl font-extrabold">404</p>
      <p className="text-lg text-ink-soft">No encontramos lo que buscas.</p>
      <Link href="/" className="font-bold text-blue hover:underline">
        Volver al inicio
      </Link>
    </main>
  );
}

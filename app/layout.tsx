import type { Metadata } from "next";
import { Rubik, Nunito_Sans } from "next/font/google";
import "./globals.css";

const rubik = Rubik({ variable: "--font-rubik", subsets: ["latin"], weight: ["500", "700", "800"] });
const nunito = Nunito_Sans({ variable: "--font-nunito", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000",
  ),
  title: {
    default: "Repasa · Convierte tus apuntes en quizzes con IA",
    template: "%s · Repasa",
  },
  description:
    "Guarda tus apuntes por tema, genera quizzes con inteligencia artificial y descubre qué temas necesitas repasar.",
  keywords: ["quiz", "apuntes", "estudiar", "IA", "repaso", "estudiantes"],
  openGraph: {
    title: "Repasa · Tus apuntes convertidos en práctica",
    description: "Pega tus notas, practica con preguntas generadas por IA y descubre qué repasar.",
    locale: "es_CO",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${rubik.variable} ${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

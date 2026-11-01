import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";

const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin"], weight: ["500", "600", "700"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

// Sets the theme before the first paint: the saved choice, else the system preference (dark by default).
const THEME_SCRIPT = `try{var t=localStorage.getItem("repasa_theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}`;

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
    <html lang="es" suppressHydrationWarning className={`${grotesk.variable} ${inter.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

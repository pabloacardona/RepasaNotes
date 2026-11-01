// Everything in "Mis apuntes" lives in one centred column.
export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-4xl">{children}</div>;
}

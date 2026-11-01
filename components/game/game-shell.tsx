// Dark hextech scene for a whole section: fixed starry background plus the light-on-dark text colour.
export function GameShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="hx">
      <div className="hx-bg" aria-hidden />
      {children}
    </div>
  );
}

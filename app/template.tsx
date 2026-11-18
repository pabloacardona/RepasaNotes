// Soft fade between pages, in plain CSS (no JS animation library on the critical path). Opacity only:
// a transform here would break position: fixed inside the pages. See .page-fade in globals.css.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-fade flex flex-1 flex-col">{children}</div>;
}

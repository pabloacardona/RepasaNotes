// Infinite horizontal ticker (pure CSS, pauses on hover).
export function Marquee({ items }: { items: string[] }) {
  const row = [...items, ...items];
  return (
    <div className="marquee relative overflow-hidden py-3 [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
      <div className="marquee-track flex w-max gap-3">
        {row.map((t, i) => (
          <span
            key={i}
            aria-hidden={i >= items.length}
            className="whitespace-nowrap rounded-full border-2 border-ink/10 bg-card px-4 py-1.5 font-display font-bold text-ink-soft"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

// Profile picture, or the first letter of the name on the brand gradient when there is none.
export function Avatar({ name, src, size = 32, className = "" }: { name: string; src?: string | null; size?: number; className?: string }) {
  const box = { width: size, height: size, fontSize: Math.round(size * 0.45) };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} style={box} className={`shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <span style={box} className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--b1)] to-[var(--b2)] font-bold text-[#2a2012] ${className}`}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

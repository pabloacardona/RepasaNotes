// Small PNG steps (6-36 KB) instead of the 200 KB-1.4 MB originals: the logo is shown at 48-72 px.
const STEPS = [96, 144, 192, 288];

export function SocratesLogo({ size = 36 }: { size?: number }) {
  const at = (px: number) => STEPS.find((s) => s >= px) ?? STEPS[STEPS.length - 1];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/icons/socrates_${at(size * 2)}.png`}
      srcSet={`/icons/socrates_${at(size)}.png 1x, /icons/socrates_${at(size * 2)}.png 2x, /icons/socrates_${at(size * 3)}.png 3x`}
      alt="Sócrates — símbolo de Repasa"
      width={size}
      height={size}
      decoding="async"
      className="shrink-0"
    />
  );
}

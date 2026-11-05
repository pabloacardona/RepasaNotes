export function SocratesLogo({ size = 36 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/socrates_icono_512.png"
      srcSet="/icons/socrates_icono_512.png 1x, /icons/socrates_icono_1024.png 2x"
      alt="Sócrates — símbolo de Repasa"
      width={size}
      height={size}
      className="shrink-0"
    />
  );
}

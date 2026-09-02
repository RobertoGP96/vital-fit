/* Logo VitalFit: pesa curvada del diseño v2 (barra verde flexionada + discos).
   `bar` controla el color de los discos exteriores según el fondo (tinta sobre
   claro, crema sobre oscuro). */

export function BarbellMark({
  bar = "#0D1F14",
  className,
}: {
  bar?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 68 44"
      fill="none"
      role="img"
      aria-label="VitalFit"
      className={className}
    >
      <path
        d="M10 26 Q34 10 58 26"
        stroke="#17C964"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="2" y="12" width="7" height="26" rx="3.5" fill={bar} />
      <rect x="11" y="17" width="6" height="17" rx="3" fill="#17C964" />
      <rect x="59" y="12" width="7" height="26" rx="3.5" fill={bar} />
      <rect x="51" y="17" width="6" height="17" rx="3" fill="#17C964" />
    </svg>
  );
}

/** Marca + nombre en Unbounded, como en el diseño. `onDark` invierte colores. */
export function Logo({
  onDark = false,
  className = "",
}: {
  onDark?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-[9px] ${className}`}>
      <BarbellMark bar={onDark ? "#F4FBF6" : "#0D1F14"} className="h-[22px] w-[34px]" />
      <span
        className={`font-display text-[19px] font-extrabold tracking-[-0.5px] ${onDark ? "text-cream" : "text-ink"}`}
      >
        Vital<span className="text-brand">Fit</span>
      </span>
    </span>
  );
}

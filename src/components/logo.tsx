/* Logo VitalFit: pesa curvada clásica (referencia del usuario), la misma
   estructura en toda la app y en los iconos. */

/* Pesa curvada clásica (misma geometría que el icono de la app; mantener
   sincronizada con scripts/icons/render.html y los SVG de public/icons y
   src/app). `bar` es el color de la barra (crema sobre oscuro, tinta sobre
   claro); los discos siempre van en verdes de marca. */
export function CurvedBarbellMark({
  bar = "#0D1F14",
  className,
}: {
  bar?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="18 144 476 202"
      fill="none"
      role="img"
      aria-label="VitalFit"
      className={className}
    >
      <path
        d="M158 250 Q256 186 354 250"
        stroke={bar}
        strokeWidth="24"
        strokeLinecap="round"
        fill="none"
      />
      <g transform="rotate(-13 147 245)">
        <rect x="132" y="150" width="30" height="190" rx="10" fill="#17C964" />
        <rect x="100" y="156" width="28" height="178" rx="10" fill="#17C964" />
        <rect x="70" y="167" width="26" height="156" rx="9" fill="#17C964" />
        <rect x="46" y="195" width="20" height="100" rx="8" fill="#12A150" />
        <rect x="26" y="218" width="14" height="54" rx="7" fill="#86EFAC" />
      </g>
      <g transform="rotate(13 365 245)">
        <rect x="350" y="150" width="30" height="190" rx="10" fill="#17C964" />
        <rect x="384" y="156" width="28" height="178" rx="10" fill="#17C964" />
        <rect x="416" y="167" width="26" height="156" rx="9" fill="#17C964" />
        <rect x="446" y="195" width="20" height="100" rx="8" fill="#12A150" />
        <rect x="472" y="218" width="14" height="54" rx="7" fill="#86EFAC" />
      </g>
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
      <CurvedBarbellMark
        bar={onDark ? "#F4FBF6" : "#0D1F14"}
        className="h-[22px] w-[52px]"
      />
      <span
        className={`font-display text-[19px] font-extrabold tracking-[-0.5px] ${onDark ? "text-cream" : "text-ink"}`}
      >
        Vital<span className="text-brand">Fit</span>
      </span>
    </span>
  );
}

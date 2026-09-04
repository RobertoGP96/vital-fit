// template.tsx se remonta en cada navegación → animación de entrada CSS
// enter-only (server component: sin framer-motion en el bundle y el HTML del
// SSR es visible sin esperar hidratación). Solo opacidad: un transform aquí
// convertiría al template en containing block de los position:fixed (Fab).
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="[animation:pageIn_.2s_ease-out]">{children}</div>;
}

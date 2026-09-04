import { Skeleton } from "@/components/skeleton";

/* Se muestra al cambiar de pestaña dentro de la ficha del cliente: la
   cabecera y las pestañas del layout persisten; solo el contenido carga. */
export default function ClienteDetalleLoading() {
  return (
    <div aria-busy className="flex flex-col gap-3">
      <Skeleton className="h-28 rounded-(--radius-card)" />
      <Skeleton className="h-28 rounded-(--radius-card)" />
      <Skeleton className="h-28 rounded-(--radius-card)" />
    </div>
  );
}

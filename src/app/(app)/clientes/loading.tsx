import { Skeleton } from "@/components/skeleton";

/* También cubre la apertura de /clientes/[id] (el límite de Suspense más
   cercano por encima del layout del cliente está aquí), así que se mantiene
   neutro: cabecera + filas. */
export default function ClientesLoading() {
  return (
    <div aria-busy className="flex flex-col gap-4">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-11 rounded-full" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-[66px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

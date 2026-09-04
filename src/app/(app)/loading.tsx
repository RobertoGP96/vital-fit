import { Skeleton } from "@/components/skeleton";

/* Esqueleto genérico para las rutas sin loading propio (notificaciones,
   formularios, etc.); las pestañas principales tienen uno a medida. */
export default function AppLoading() {
  return (
    <div aria-busy className="flex flex-col gap-4">
      <Skeleton className="h-7 w-40" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[64px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/skeleton";

export default function AgendaLoading() {
  return (
    <div aria-busy className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-8 w-32 rounded-full" />
      </div>

      {/* Navegación de semana */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-[64px] rounded-2xl" />
        ))}
      </div>

      {/* Sesiones del día */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-24 rounded-[22px]" />
        <Skeleton className="h-24 rounded-[22px]" />
        <Skeleton className="h-24 rounded-[22px]" />
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/skeleton";

export default function PanelLoading() {
  return (
    <div aria-busy className="flex flex-col gap-6">
      {/* Saludo */}
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>

      {/* Hero */}
      <Skeleton className="h-[158px] rounded-3xl" />

      {/* Accesos rápidos */}
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-[74px] rounded-(--radius-card)" />
        <Skeleton className="h-[74px] rounded-(--radius-card)" />
        <Skeleton className="h-[74px] rounded-(--radius-card)" />
      </div>

      {/* Sesiones de hoy */}
      <div>
        <Skeleton className="mb-3 h-5 w-36" />
        <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5">
          <Skeleton className="h-[180px] w-[210px] shrink-0 rounded-[22px]" />
          <Skeleton className="h-[180px] w-[210px] shrink-0 rounded-[22px]" />
        </div>
      </div>

      {/* Tus clientes */}
      <div>
        <Skeleton className="mb-3 h-5 w-28" />
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-[62px] rounded-(--radius-card)" />
          <Skeleton className="h-[62px] rounded-(--radius-card)" />
          <Skeleton className="h-[62px] rounded-(--radius-card)" />
        </div>
      </div>
    </div>
  );
}

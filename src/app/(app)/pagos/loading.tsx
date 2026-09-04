import { Skeleton } from "@/components/skeleton";

export default function PagosLoading() {
  return (
    <div aria-busy className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Filtros */}
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
        <Skeleton className="h-[34px] w-[72px] shrink-0 rounded-full" />
        <Skeleton className="h-[34px] w-[88px] shrink-0 rounded-full" />
        <Skeleton className="h-[34px] w-[96px] shrink-0 rounded-full" />
        <Skeleton className="h-[34px] w-[76px] shrink-0 rounded-full" />
      </div>

      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[64px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/skeleton";

export default function MasLoading() {
  return (
    <div aria-busy className="flex flex-col gap-6">
      <Skeleton className="h-[92px] rounded-(--radius-card)" />
      <Skeleton className="h-40 rounded-(--radius-card)" />
      <Skeleton className="h-11 rounded-full" />
    </div>
  );
}

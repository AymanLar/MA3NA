import { Skeleton } from '@/components/ui/primitives';

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-shell px-5 sm:px-7 lg:px-10">
      <div className="pb-20 pt-10 sm:pt-14">
        <Skeleton className="h-3 w-40" />

        <div className="mt-10 border-b border-line pb-8">
          <Skeleton className="h-11 w-full max-w-2xl sm:h-14" />
          <Skeleton className="mt-5 h-4 w-full max-w-2xl" />
          <Skeleton className="mt-2 h-4 w-full max-w-lg" />
        </div>

        <div className="border-b border-line py-10">
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-24" />
            ))}
          </div>
          <div className="mt-6 grid gap-px bg-line sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-bg p-6">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-5 w-48" />
                <Skeleton className="mt-3 h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-2/3" />
                <Skeleton className="mt-5 h-8 w-32" />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-12 lg:grid-cols-2">
          <div className="border border-line p-6">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="mt-8 h-[260px] w-full" />
          </div>
          <div className="border border-line p-6">
            <Skeleton className="h-4 w-40" />
            <div className="mt-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-3 flex-1" />
                  <Skeleton className="h-1 w-20" />
                  <Skeleton className="h-3 w-10" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
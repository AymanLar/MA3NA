import { Skeleton } from '@/components/ui/primitives';

export default function LoadingSector() {
  return (
    <div className="mx-auto w-full max-w-shell px-5 sm:px-7 lg:px-10">
      <div className="pb-20 pt-10 sm:pt-14">
        <Skeleton className="h-3 w-56" />

        <div className="mt-10 border-b border-line pb-8">
          <div className="flex flex-wrap gap-2.5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="mt-6 h-11 w-full max-w-xl sm:h-14" />
          <Skeleton className="mt-5 h-4 w-full max-w-2xl" />
          <Skeleton className="mt-2 h-4 w-full max-w-xl" />

          <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="mt-3 h-5 w-24" />
                <Skeleton className="mt-2 h-2 w-20" />
              </div>
            ))}
          </div>
        </div>

        <div className="border border-line p-6">
          <Skeleton className="h-4 w-40" />
          <div className="mt-8 grid grid-cols-2 gap-px lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-bg p-6">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-3 h-9 w-28" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-8 h-[280px] w-full" />
        </div>

        <div className="mt-16 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-bg p-5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-2 h-3 w-40" />
              <div className="mt-4 flex items-baseline justify-between border-t border-line pt-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
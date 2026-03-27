export function SkeletonStrip() {
  return (
    <div className="space-y-2">
      {/* Header skeleton */}
      <div className="flex items-center gap-2 px-1">
        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        <div className="h-5 w-8 rounded-full bg-muted animate-pulse" />
      </div>
      {/* Cards skeleton */}
      <div className="-mx-4 px-4">
        <div className="flex gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex-none" style={{ width: "156px", animationDelay: `${i * 75}ms` }}>
              <div className="aspect-video w-full rounded-xl skeleton-shimmer" />
              <div className="mt-2 h-3 w-20 rounded bg-muted animate-pulse" style={{ animationDelay: `${i * 75}ms` }} />
              <div className="mt-1 h-2.5 w-16 rounded bg-muted animate-pulse" style={{ animationDelay: `${i * 75 + 50}ms` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/5">
      <div className="aspect-video w-full skeleton-shimmer" />
      <div className="p-3 space-y-2">
        <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

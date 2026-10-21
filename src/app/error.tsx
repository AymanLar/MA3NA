'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RotateCcw } from 'lucide-react';
import { Shell } from '@/components/ui/primitives';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Shell>
      <div className="flex min-h-[62vh] flex-col justify-center py-20">
        <div className="label mb-4">
          <span className="h-px w-5 bg-neg/70" />
          Render error
        </div>
        <h1 className="max-w-2xl font-display text-4xl font-semibold leading-[1.04] tracking-tightest text-ink sm:text-5xl">
          The view failed to render
        </h1>
        <p className="mt-5 max-w-xl text-[0.975rem] leading-relaxed text-ink-soft">
          Something threw while assembling this plate. The dataset itself is static, so retrying is
          usually enough.
        </p>

        {error.digest ? (
          <p className="num mt-5 text-2xs text-ink-faint">digest {error.digest}</p>
        ) : null}

        <div className="mt-10 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-9 items-center gap-2 border border-accent/40 bg-accent/[0.07] px-4 font-mono text-2xs uppercase tracking-[0.12em] text-accent transition-all duration-200 hover:border-accent/60"
          >
            <RotateCcw size={12} />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-2 border border-line px-4 font-mono text-2xs uppercase tracking-[0.12em] text-ink-soft transition-all duration-200 hover:border-line-strong hover:bg-ink/[0.045] hover:text-ink"
          >
            Back to explore
          </Link>
        </div>
      </div>
    </Shell>
  );
}
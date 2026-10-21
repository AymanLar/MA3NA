'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { cx } from '@/lib/utils';
import { useTheme } from './ThemeProvider';
import { SearchTrigger, CommandPalette } from '@/components/search/CommandPalette';

const NAV = [
  { href: '/', label: 'Explore' },
  { href: '/market', label: 'Market' },
  { href: '/companies', label: 'Companies' },
  { href: '/sectors', label: 'Sectors' },
  { href: '/events', label: 'Events' },
];

function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cx('flex items-baseline gap-[3px]', className)}>
      <span className="font-display text-[1.0625rem] font-bold leading-none tracking-tightest text-ink">
        MA3NA
      </span>
      <span className="h-[3px] w-[3px] translate-y-[-2px] bg-accent" aria-hidden />
    </span>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [mobile, setMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // subscribe to the external scroll position rather than mirroring it in state
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      setScrolled(window.scrollY > 12);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(read);
    };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Close the drawer on navigation by adjusting state during render, which is
  // cheaper than an effect and avoids a visible frame of the open sheet.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (mobile) setMobile(false);
  }

  useEffect(() => {
    document.body.style.overflow = mobile ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobile]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      <header
        className={cx(
          'sticky top-0 z-50 border-b transition-colors duration-300',
          scrolled ? 'glass border-line' : 'border-transparent bg-bg/70 backdrop-blur-sm',
        )}
      >
        <div className="mx-auto flex h-14 w-full max-w-shell items-center gap-6 px-5 sm:px-7 lg:px-10">
          <Link href="/" className="group flex shrink-0 items-center gap-3" aria-label="MA3NA home">
            <span className="relative flex h-6 w-6 items-center justify-center">
              <span className="absolute inset-0 rotate-45 border border-accent/45 transition-colors duration-300 group-hover:border-accent" />
              <span className="h-1 w-1 rotate-45 bg-accent" />
            </span>
            <Wordmark />
            <span className="hidden font-mono text-[0.5625rem] uppercase tracking-[0.2em] text-ink-faint lg:block">
              Casablanca / Morocco
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cx(
                  'relative px-3 py-1.5 text-[0.8125rem] transition-colors duration-200',
                  isActive(n.href) ? 'text-ink' : 'text-ink-mute hover:text-ink',
                )}
              >
                {n.label}
                {isActive(n.href) ? (
                  <span className="absolute inset-x-3 -bottom-px h-px bg-accent" />
                ) : null}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <SearchTrigger />
            <Link
              href="/simulator"
              className={cx(
                'hidden h-8 items-center border px-2.5 font-mono text-2xs uppercase tracking-[0.12em] transition-colors duration-200 lg:flex',
                isActive('/simulator')
                  ? 'border-accent/50 bg-accent/10 text-accent'
                  : 'border-line text-ink-mute hover:border-line-strong hover:text-ink',
              )}
            >
              Simulator
            </Link>
            <button
              onClick={toggle}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              className="flex h-8 w-8 items-center justify-center text-ink-mute transition-colors duration-200 hover:text-ink"
            >
              {theme === 'dark' ? <Sun size={14} strokeWidth={1.7} /> : <Moon size={14} strokeWidth={1.7} />}
            </button>
            <button
              onClick={() => setMobile((m) => !m)}
              aria-label="Toggle menu"
              aria-expanded={mobile}
              className="flex h-8 w-8 items-center justify-center text-ink-mute transition-colors duration-200 hover:text-ink md:hidden"
            >
              {mobile ? <X size={16} strokeWidth={1.7} /> : <Menu size={16} strokeWidth={1.7} />}
            </button>
          </div>
        </div>
        <div className={cx('rule transition-opacity duration-300', scrolled ? 'opacity-100' : 'opacity-0')} />
      </header>

      {/* mobile sheet */}
      <div
        className={cx(
          'fixed inset-0 z-40 md:hidden',
          mobile ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >
        <button
          aria-label="Close menu"
          onClick={() => setMobile(false)}
          className={cx(
            'absolute inset-0 bg-bg/70 backdrop-blur-sm transition-opacity duration-300',
            mobile ? 'opacity-100' : 'opacity-0',
          )}
        />
        <nav
          className={cx(
            'absolute inset-x-0 top-14 border-b border-line bg-surface/97 px-5 py-3 backdrop-blur-xl transition-all duration-300 ease-swift',
            mobile ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0',
          )}
        >
          {NAV.map((n, i) => (
            <Link
              key={n.href}
              href={n.href}
              className={cx(
                'flex items-center justify-between border-b border-line py-3.5 transition-all duration-300',
                mobile ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
              )}
              style={{ transitionDelay: mobile ? `${i * 40 + 60}ms` : '0ms' }}
            >
              <span className={cx('font-display text-lg tracking-tight', isActive(n.href) ? 'text-accent' : 'text-ink')}>
                {n.label}
              </span>
              <span className="font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-ink-faint">
                {String(i + 1).padStart(2, '0')}
              </span>
            </Link>
          ))}
          <Link
            href="/simulator"
            className="flex items-center justify-between py-3.5"
          >
            <span
              className={cx(
                'font-display text-lg tracking-tight',
                isActive('/simulator') ? 'text-accent' : 'text-ink',
              )}
            >
              Simulator
            </span>
            <span className="font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-ink-faint">06</span>
          </Link>
        </nav>
      </div>

      <CommandPalette />
    </>
  );
}

export { Wordmark };
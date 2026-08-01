'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { MonitorIcon, MoonIcon, SunIcon, CheckIcon } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

const OPTIONS = [
  { value: 'light',  Icon: SunIcon,     label: 'Light'  },
  { value: 'dark',   Icon: MoonIcon,    label: 'Dark'   },
  { value: 'system', Icon: MonitorIcon, label: 'System' },
] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const activeTheme = mounted ? theme : undefined;

  return (
    <div
      role="group"
      aria-label="Pilih tema"
      className={cn(
        'flex items-center gap-0.5 rounded-lg border bg-muted/40 p-0.5',
        className,
      )}
    >
      {OPTIONS.map(({ value, Icon, label }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={activeTheme === value}
          onClick={() => setTheme(value)}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md transition-all',
            activeTheme === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="size-[0.9rem]" />
        </button>
      ))}
    </div>
  );
}

export function ThemeDropdown({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const activeTheme = mounted ? theme : 'system';
  const ActiveIcon = OPTIONS.find((o) => o.value === activeTheme)?.Icon ?? MonitorIcon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Pilih tema"
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full',
            'text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
            className,
          )}
        >
          <ActiveIcon className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {OPTIONS.map(({ value, Icon, label }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Icon className="size-4 text-muted-foreground" />
            <span>{label}</span>
            {activeTheme === value && <CheckIcon className="size-3.5 ml-auto text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

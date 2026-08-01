'use client';

import { Toaster as Sonner } from 'sonner';
import type { ComponentProps } from 'react';

export function Toaster(props: ComponentProps<typeof Sonner>) {
  return (
    <Sonner
      theme="system"
      richColors
      closeButton
      position="top-right"
      toastOptions={{ duration: 5000 }}
      {...props}
    />
  );
}

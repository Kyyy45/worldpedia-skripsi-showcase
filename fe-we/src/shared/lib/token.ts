import { env } from '@/shared/config/env';

export const tokenStorage = {
  getAccess: (): string | null => env.DEMO_TOKEN || null,
};

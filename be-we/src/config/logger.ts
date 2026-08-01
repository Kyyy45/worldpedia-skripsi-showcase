export const logger = {
  info:  (...args: unknown[]): void => { console.log('[info] ', ...args); },
  warn:  (...args: unknown[]): void => { console.warn('[warn] ', ...args); },
  error: (...args: unknown[]): void => { console.error('[error]', ...args); },
  // Log jenis "debug" ini otomatis tidak muncul saat aplikasi berjalan
  // dalam mode production, karena isinya biasanya hanya untuk keperluan
  // pengembangan dan tidak perlu dilihat pengguna akhir.
  debug: (...args: unknown[]): void => {
    if (process.env.NODE_ENV !== 'production') console.debug('[debug]', ...args);
  },
};

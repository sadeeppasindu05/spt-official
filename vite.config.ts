import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  
  // In production (HF Space), use runtime window.__ vars from /api/config
  // In development, use .env.local directly
  const defineVars = isDev ? {} : {
    'import.meta.env.VITE_SUPABASE_URL': 'window.__SUPABASE_URL__',
    'import.meta.env.VITE_SUPABASE_ANON_KEY': 'window.__SUPABASE_ANON_KEY__',
  };

  return {
    define: defineVars,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'motion'],
            supabase: ['@supabase/supabase-js'],
            ui: ['lucide-react'],
          },
        },
      },
    },
  };
});

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

function resolveBasePath(command: string): string {
  // In development dev-server, serve from root
  if (command === 'serve') {
    return '/';
  }

  // 1. Explicit non-empty BASE_PATH (e.g. from custom build environment)
  if (process.env.BASE_PATH && process.env.BASE_PATH.trim() !== '' && process.env.BASE_PATH.trim() !== '/') {
    const p = process.env.BASE_PATH.trim();
    const withLeading = p.startsWith('/') ? p : `/${p}`;
    return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
  }

  // 2. GitHub repository detection (works in GitHub Actions and GitHub Pages)
  if (process.env.GITHUB_REPOSITORY) {
    const repoParts = process.env.GITHUB_REPOSITORY.split('/');
    const repoName = repoParts[1] || '';
    // If it's a user/organization site (e.g. username.github.io), base is '/'
    if (repoName.endsWith('.github.io')) {
      return '/';
    }
    if (repoName) {
      return `/${repoName}/`;
    }
  }

  // 3. Explicit non-empty BASE_URL
  if (process.env.BASE_URL && process.env.BASE_URL.trim() !== '' && process.env.BASE_URL.trim() !== '/') {
    const u = process.env.BASE_URL.trim();
    const withLeading = u.startsWith('/') ? u : `/${u}`;
    return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
  }

  // 4. Cloudflare Pages, Vercel, and Netlify host from the root domain
  if (process.env.CF_PAGES || process.env.VERCEL || process.env.NETLIFY) {
    return '/';
  }

  // 5. Default to relative base ('./') for maximum portability across arbitrary hosts and subdirectories
  return './';
}

export default defineConfig(({ command }) => {
  return {
    base: resolveBasePath(command),
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'esnext',
      minify: 'esbuild',
      cssMinify: true,
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/scheduler')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/motion')) {
              return 'vendor-motion';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

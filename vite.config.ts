import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

function resolveBasePath(): string {
  // 1. Explicitly provided BASE_PATH (e.g. from GitHub actions/configure-pages)
  if (process.env.BASE_PATH !== undefined) {
    const p = process.env.BASE_PATH.trim();
    if (p === '' || p === '/') return '/';
    return p.endsWith('/') ? p : `${p}/`;
  }

  // 2. Explicitly provided BASE_URL
  if (process.env.BASE_URL !== undefined) {
    const u = process.env.BASE_URL.trim();
    if (u === '' || u === '/') return '/';
    return u.endsWith('/') ? u : `${u}/`;
  }

  // 3. Cloudflare Pages, Vercel, and Netlify host from the root domain
  if (process.env.CF_PAGES || process.env.VERCEL || process.env.NETLIFY) {
    return '/';
  }

  // 4. GitHub repository detection (e.g. in GitHub Actions without configure-pages)
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

  // 5. Default to relative base ('./') for maximum portability across hosts and subdirectories
  return './';
}

export default defineConfig(() => {
  return {
    base: resolveBasePath(),
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
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

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  // Relative assets work at the root and under a GitHub Pages project path.
  base: './',
  build: {
    rollupOptions: {
      output: {
        // Static content stays independently cacheable as the corpus grows.
        manualChunks(id) {
          const partition = id.match(/\/src\/content\/sentences\/([^/]+)\.json$/);
          if (partition) return `sentences-${partition[1]}`;
          if (id.endsWith('/src/content/verbs.json')) return 'verb-paradigms';
        },
      },
    },
  },
});

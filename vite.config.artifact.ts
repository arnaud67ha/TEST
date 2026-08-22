import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Standalone single-file build used only to generate a quick shareable
// preview (e.g. as a Claude Artifact). Not part of the normal PWA build.
export default defineConfig({
  build: {
    outDir: 'dist-artifact',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
  },
  plugins: [viteSingleFile()],
});

import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  base: '',
  build: {
    outDir: 'lib',
    assetsDir: '',
    emptyOutDir: true,
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index'
    },
    minify: true
  },
  worker: {
    format: "es",
  },
  plugins: [
    dts({ rollupTypes: true }),
    {
      name: "webpack5ify-webworker",
      renderChunk: {
        order: 'post',
        async handler(code) {
          return code.replaceAll('.href', '');
        }
      }
    }
  ]
})
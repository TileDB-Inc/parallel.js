import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
    base: '',
    build: {
        outDir: 'lib',
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
    plugins: [dts({ rollupTypes: true })]
})
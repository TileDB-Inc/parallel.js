import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
    base: '',
    build: {
        outDir: 'lib',
        emptyOutDir: true,
        lib: {
            entry: 'src/parallel.ts',
            formats: ['es']
        },
        rollupOptions: {
            external: ['node:child_process']
        },
        minify: false
    },
    worker: {
        format: "es"
    },
    plugins: [dts({ rollupTypes: true })]
})
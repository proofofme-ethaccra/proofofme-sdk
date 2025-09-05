import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    'apis/index': 'packages/apis/index.ts',
    'contracts/index': 'packages/contracts/index.ts'
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  external: ['ethers'],
  noExternal: ['./packages/contracts/artifacts/**/*.json'],
  outDir: 'dist',
  treeshake: true,
  bundle: true,
  target: 'node16',
  loader: {
    '.json': 'json'
  }
});

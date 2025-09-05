import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";

const external = ["ethers", "jose", "@filoz/synapse-sdk"];

const sharedPlugins = [
  typescript({
    tsconfig: "./tsconfig.json",
    exclude: ["**/hardhat.config.ts", "**/test/**/*"],
    compilerOptions: {
      declaration: false,
      sourceMap: true,
    },
  }),
  json({
    preferConst: true,
    compact: true,
  }),
];

export default [
  // APIs bundle
  {
    input: "packages/apis/index.ts",
    output: [
      {
        file: "dist/apis/index.js",
        format: "cjs",
        sourcemap: true,
      },
      {
        file: "dist/apis/index.mjs",
        format: "es",
        sourcemap: true,
      },
    ],
    external,
    plugins: sharedPlugins,
  },
  // Contracts bundle
  {
    input: "packages/contracts/index.ts",
    output: [
      {
        file: "dist/contracts/index.js",
        format: "cjs",
        sourcemap: true,
      },
      {
        file: "dist/contracts/index.mjs",
        format: "es",
        sourcemap: true,
      },
    ],
    external,
    plugins: sharedPlugins,
  },
];

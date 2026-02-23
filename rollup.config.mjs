import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default [
  {
    input: "./module/synthicide.mjs",
    output: {
      file: "./dist/module/synthicide.mjs",
      format: "esm",
      sourcemap: true,
    },
    plugins: [nodeResolve(), commonjs()],
  },
];

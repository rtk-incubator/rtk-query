import babel from '@rollup/plugin-babel';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';

/** @type {import("rollup").RollupOptions} */
const defaultConfig = {
  input: 'src/index.ts',
  external: [/@babel\/runtime/, /@reduxjs\/toolkit/, /react/, /react-redux/, /immer/, /tslib/],
  treeshake: {
    propertyReadSideEffects: false,
  },
};

const defaultTerserOptions = {
  output: { comments: false },
  compress: {
    keep_infinity: true,
    pure_getters: true,
    passes: 10,
  },
  ecma: 5,
  warnings: true,
};

const defaultTsConfig = { declaration: false, declarationMap: false, target: 'ESNext', module: 'esnext' };

/** @type {import("rollup").RollupOptions} */
const configs = [
  // ESM
  {
    ...defaultConfig,
    output: [
      {
        dir: 'dist/esm',
        format: 'es',
        sourcemap: true,
        preserveModules: true,
      },
    ],
    plugins: [
      typescript(defaultTsConfig),
      babel({
        exclude: 'node_modules/**',
        extensions: ['.js', '.ts'],
        babelHelpers: 'runtime',
        presets: [
          [
            '@babel/preset-env',
            {
              targets: { node: true, browsers: ['defaults', 'not IE 11', 'maintained node versions'] },
              bugfixes: true,
              loose: true,
            },
          ],
        ],
        plugins: [['@babel/plugin-transform-runtime', { useESModules: true }]],
      }),
    ],
  },
  // CJS:
  ...withMinfy((minfied) => ({
    ...defaultConfig,
    output: [
      {
        dir: 'dist',
        format: 'cjs',
        sourcemap: true,
        entryFileNames: minfied ? '[name].cjs.production.min.js' : '[name].cjs.development.js',
      },
    ],
    plugins: [
      typescript(
        minfied
          ? defaultTsConfig
          : { ...defaultTsConfig, declarationDir: 'dist/ts', declaration: true, declarationMap: true }
      ),
      babel({
        exclude: 'node_modules/**',
        extensions: ['.js', '.ts'],
        babelHelpers: 'runtime',
        presets: [['@babel/preset-env', { targets: { node: true, browsers: ['defaults'] } }]],
        plugins: [['@babel/plugin-transform-runtime', { useESModules: false }]],
      }),
      ...(minfied ? [terser({ ...defaultTerserOptions, toplevel: true })] : []),
    ],
  })),
];

function withMinfy(build) {
  return [build(false), build(true)];
}

export default configs;

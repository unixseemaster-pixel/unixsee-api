import path from 'node:path';
import { fileURLToPath } from 'node:url';

import swc from 'unplugin-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2022',
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '#': path.join(rootDir, 'src'),
    },
  },
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['reflect-metadata'],
    include: ['test/**/*.e2e-spec.ts'],
    clearMocks: true,
    restoreMocks: true,
    fileParallelism: false,
    testTimeout: 30_000,
  },
});

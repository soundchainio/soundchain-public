const esbuild = require('esbuild');
const { esbuildDecorators } = require('@anatine/esbuild-decorators');

async function build() {
  try {
    const result = await esbuild.build({
      entryPoints: ['./src/lambda/graphql/handler.ts', './src/lambda/hello/handler.ts'],
      bundle: true,
      minify: true,
      sourcemap: true,
      platform: 'node',
      target: 'es2020',
      outdir: 'dist',
      format: 'cjs',
      plugins: [
        esbuildDecorators({
          tsconfig: './tsconfig.json',
          cwd: process.cwd(),
        }),
      ],
      metafile: true,
    });

    console.log('Build completed successfully');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();

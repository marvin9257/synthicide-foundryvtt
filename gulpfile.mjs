import { rollup } from 'rollup';
import gulp from 'gulp';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import rollupConfig from './rollup.config.mjs';

const distDirectory = './dist';
const staticFiles = ['assets', 'css', 'lang', 'templates', 'system.json', 'README.md', 'LICENSE', 'LICENSE.txt', 'packs'];

async function clean() {
  if (await fs.pathExists(distDirectory)) {
    await fs.emptyDir(distDirectory);
    console.log(chalk.yellow(`Emptied ${distDirectory}`));
  }
}

async function buildJS() {
  try {
    const configs = Array.isArray(rollupConfig) ? rollupConfig : [rollupConfig];
    for (const config of configs) {
      const bundle = await rollup(config);
      await bundle.write(config.output);
    }
    console.log(chalk.green('✅ JavaScript build completed successfully'));
  } catch (err) {
    console.error(chalk.red('❌ JavaScript build failed:'), err);
    throw err;
  }
}

async function copyStatic() {
  for (const file of staticFiles) {
    if (await fs.pathExists(file)) {
      await fs.copy(file, path.join(distDirectory, path.basename(file)));
      console.log(chalk.green(`Copied ${file}`));
    }
  }
}

gulp.task('clean', clean);
gulp.task('build:js', buildJS);
gulp.task('copy:static', copyStatic);
gulp.task('build', gulp.series('clean', 'build:js', 'copy:static'));

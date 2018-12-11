'use strict';

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const camelCase = require('camelcase');
const ngc = require('@angular/compiler-cli/src/main').main;
const rollup = require('rollup');
const uglify = require('rollup-plugin-uglify').uglify;
const sourcemaps = require('rollup-plugin-sourcemaps');
const nodeResolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');

const inlineResources = require('./inline-resources');

const packageJson = require('./package.json');
const libName = packageJson.name;
const rootFolder = path.join(__dirname);
const compilationFolder = path.join(rootFolder, 'out-tsc');
const srcFolder = path.join(rootFolder, 'src/lib');
const distFolder = path.join(rootFolder, 'dist');
const tempLibFolder = path.join(compilationFolder, 'lib');
const es5OutputFolder = path.join(compilationFolder, 'lib-es5');
const es2015OutputFolder = path.join(compilationFolder, 'lib-es2015');

return Promise.resolve()
// Copy library to temporary folder and inline html/css.
  .then(() => _relativeCopy(`**/*`, srcFolder, tempLibFolder)
    .then(() => inlineResources(tempLibFolder))
    .then(() => console.log('Inlining succeeded.'))
  )
  // Compile to ES2015.
  .then(() => ngc(['--project', `${tempLibFolder}/tsconfig.lib.json`]))
  .then(exitCode => exitCode === 0 ? Promise.resolve() : Promise.reject())
  .then(() => console.log('ES2015 compilation succeeded.'))
  // Compile to ES5.
  .then(() => ngc(['--project', `${tempLibFolder}/tsconfig.es5.json`]))
  .then(exitCode => exitCode === 0 ? Promise.resolve() : Promise.reject())
  .then(() => console.log('ES5 compilation succeeded.'))
  // Copy typings and metadata to `dist/` folder.
  .then(() => Promise.resolve()
    .then(() => _relativeCopy('**/*.d.ts', es2015OutputFolder, distFolder))
    .then(() => _relativeCopy('**/*.metadata.json', es2015OutputFolder, distFolder))
    .then(() => console.log('Typings and metadata copy succeeded.'))
  )
  // Bundle lib.
  .then(() => {
    // Base configuration.
    const es5Entry = path.join(es5OutputFolder, `${libName}.js`);
    const es2015Entry = path.join(es2015OutputFolder, `${libName}.js`);
    const rollupBaseConfig = {
      output: {
        name: camelCase(libName),
        globals: {
          // The key here is library name, and the value is the the name of the global variable name
          // the window object.
          // See https://github.com/rollup/rollup/wiki/JavaScript-API#globals for more.
          '@angular/common': 'ng.common',
          '@angular/common/http': 'ng.common.http',
          '@angular/core': 'ng.core',
          'laravel-echo': 'Echo',
          'pusher-js': 'Pusher',
          'rxjs': 'Rx',
          'rxjs/operators': 'Rx.Observable.prototype',
          'socket.io-client': 'io',
        },
        sourceMap: true,
      },
      // ATTENTION:
      // Add any dependency or peer dependency your library to `globals` and `external`.
      // This is required for UMD bundle users.
      external: [
        // List of dependencies
        // See https://github.com/rollup/rollup/wiki/JavaScript-API#external for more.
        '@angular/common',
        '@angular/common/http',
        '@angular/core',
        'laravel-echo',
        'pusher-js',
        'rxjs',
        'rxjs/operators',
        'socket.io-client',
      ],
      plugins: [
        nodeResolve({jsnext: true, module: true, browser: true}),
        commonjs(/*{
          include: [
            'node_modules/!**',
            // 'node_modules/laravel-echo/!**',
            // 'node_modules/pusher-js/!**',
            // 'node_modules/rxjs/!**',
            // 'node_modules/socket.io-client/!**'
          ]
        }*/),
        sourcemaps(),
      ]
    };

    // UMD bundle.
    const umdConfig = Object.assign({}, rollupBaseConfig, {
      input: es5Entry,
      output: Object.assign({}, rollupBaseConfig.output, {
        file: path.join(distFolder, `bundles`, `${libName}.umd.js`),
        format: 'umd',
      }),
    });

    // Minified UMD bundle.
    const minifiedUmdConfig = Object.assign({}, rollupBaseConfig, {
      input: es5Entry,
      output: Object.assign({}, rollupBaseConfig.output, {
        file: path.join(distFolder, `bundles`, `${libName}.umd.min.js`),
        format: 'umd',
      }),
      plugins: rollupBaseConfig.plugins.concat([uglify({})])
    });

    // ESM+ES5 flat module bundle.
    const esm5config = Object.assign({}, rollupBaseConfig, {
      input: es5Entry,
      output: Object.assign({}, rollupBaseConfig.output, {
        file: path.join(distFolder, `${libName}.es5.js`),
        format: 'es',
      }),
    });

    // ESM+ES2015 flat module bundle.
    const esm2015config = Object.assign({}, rollupBaseConfig, {
      input: es2015Entry,
      output: Object.assign({}, rollupBaseConfig.output, {
        file: path.join(distFolder, `${libName}.js`),
        format: 'es',
      }),
    });

    const allBundles = [
      umdConfig,
      minifiedUmdConfig,
      esm5config,
      esm2015config
    ].map(cfg => rollup.rollup(cfg).then(bundle => bundle.write(cfg.output)));

    return Promise.all(allBundles)
      .then(() => console.log('All bundles generated successfully.'))
  })
  // Copy package files
  .then(() => Promise.resolve()
    .then(() => _relativeCopy('laravel-echo.d.ts', path.join(rootFolder, 'src', 'lib'), distFolder))
    .then(() => _relativeCopy('LICENSE', rootFolder, distFolder))
    .then(() => _relativeCopy('README.md', rootFolder, distFolder))
    .then(() => _generatePackageJson(distFolder))
    .then(() => console.log('Package files copy succeeded.'))
  )
  .catch(e => {
    console.error('Build failed. See below for errors.\n');
    console.error(e);
    process.exit(1);
  });


function _generatePackageJson(to) {
  return new Promise((resolve, reject) => {
    const contents = Object.assign({}, packageJson);
    delete contents.scripts;
    delete contents.dependencies;
    delete contents.devDependencies;

    fs.writeFile(path.join(to, 'package.json'), JSON.stringify(contents, null, 2), err => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });
}

// Copy files maintaining relative paths.
function _relativeCopy(fileGlob, from, to) {
  return new Promise((resolve, reject) => {
    glob(fileGlob, {cwd: from, nodir: true}, (err, files) => {
      if (err) {
        reject(err);
        return;
      }

      var promise = Promise.resolve();

      files.forEach(file => {
        const origin = path.join(from, file);
        const dest = path.join(to, file);
        const dir = path.dirname(dest);

        promise = promise.then(() => _recursiveMkDir(dir).then(() => new Promise((resolve, reject) => {
          fs.copyFile(origin, dest, (err) => {
            if (err) {
              reject(err);
              return;
            }

            resolve();
          });
        })));
      });

      promise.then(resolve, reject);
    });
  });
}

// Recursively create a dir.
function _recursiveMkDir(dir) {
  return new Promise((resolve, reject) => {
    fs.stat(dir, (err, stat) => {
      if (err) {
        if (err.code !== 'ENOENT') {
          reject(err);
          return;
        }

        _recursiveMkDir(path.dirname(dir)).then(() => new Promise((resolve, reject) => {
          fs.mkdir(dir, (err) => {
            if (err) {
              reject(err);
              return;
            }

            resolve();
          });
        })).then(resolve, reject);
        return;
      }

      if (!stat || !stat.isDirectory()) {
        reject('not a directory');
        return;
      }

      resolve();
    });
  });
}

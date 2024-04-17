import babel from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import commonJs from '@rollup/plugin-commonjs';

const packageJson = require('./package.json');
const version = packageJson.version;
const homepage = packageJson.homepage;

const banner = `
/*!
 * tiny-virtual-list v${version}
 * open source under the MIT license
 * ${homepage}
 */
`;

export default {
  input: 'src/index.js',
  output: [
    {
      format: 'umd',
      file: 'dist/tiny-virtual-list.js',
      name: 'Virtual',
      sourcemap: false,
      banner: banner.replace(/\n/, ''),
    },
    {
      format: 'umd',
      file: 'dist/tiny-virtual-list.min.js',
      name: 'Virtual',
      sourcemap: false,
      banner: banner.replace(/\n/, ''),
      plugins: [terser()],
    },
  ],
  plugins: [babel(), resolve(), commonJs()],
};

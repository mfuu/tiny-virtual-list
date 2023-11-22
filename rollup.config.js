import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonJs from 'rollup-plugin-commonjs';
import { uglify } from 'rollup-plugin-uglify';

const packageJson = require('./package.json');
const version = packageJson.version;
const homepage = packageJson.homepage;

const banner = `
/*!
 * virtual-list v${version}
 * open source under the MIT license
 * ${homepage}
 */
`;

export default {
  input: 'src/index.js',
  output: [
    {
      format: 'umd',
      file: 'dist/virtual-list.js',
      name: 'Sortable',
      sourcemap: false,
      banner: banner.replace(/\n/, ''),
    },
    {
      format: 'umd',
      file: 'dist/virtual-list.min.js',
      name: 'Sortable',
      sourcemap: false,
      banner: banner.replace(/\n/, ''),
      plugins: [uglify()],
    },
  ],
  plugins: [babel(), resolve(), commonJs()],
};

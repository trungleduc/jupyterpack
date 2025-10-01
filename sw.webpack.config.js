const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const rules = [
  {
    test: /\.ts$/,
    loader: 'ts-loader',
    options: {
      configFile: path.resolve('./tsconfig.json')
    }
  },
  { test: /\.js$/, loader: 'source-map-loader' },
  { test: /\.css$/, use: ['style-loader', 'css-loader'] }
];

module.exports = [
  {
    entry: './lib/swConnection/sw.js',
    output: {
      filename: 'service-worker.js',
      path: path.resolve(__dirname, 'jupyterpack', 'labextension', 'static')
    },
    module: {
      rules
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'src/ping.html'),
            to: path.resolve(
              __dirname,
              'jupyterpack/labextension/static/__jupyterpack__/ping.html'
            )
          }
        ]
      })
    ]
  }
];

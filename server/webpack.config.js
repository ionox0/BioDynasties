const path = require('path');

module.exports = {
  entry: {
    'bundle': './index.ts',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'server.js',
    path: path.resolve(__dirname, '.'),
  },
  watch: true,
  mode: 'development',
  target: 'node',
};
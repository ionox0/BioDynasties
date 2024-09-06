const path = require('path');

module.exports = {
  entry: {
    'bundle': './src/main.ts',
    'webworker': './src/terrain/terrain-builder-threaded-worker.ts'
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
    filename: '[name].js',
    sourceMapFilename: '[name].js.map',
    path: path.resolve(__dirname, 'build'),
  },
  watch: true,
  mode: 'development',
};
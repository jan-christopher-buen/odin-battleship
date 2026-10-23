const path = require('node:path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'main.[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: './',
    clean: true,
  },
  module: { rules: [{ test: /\.css$/i, use: ['style-loader', 'css-loader'] }] },
  plugins: [new HtmlWebpackPlugin({ template: './src/index.html' })],
  devServer: { port: 8080, hot: true },
};

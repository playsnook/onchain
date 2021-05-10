const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports = {
  mode: 'development',
  entry: {
    main: './src/snookweb/index.js',
    snookweb: './src/snookweb/snookweb.js'
  },
  devtool: 'inline-source-map',
  devServer: {
    contentBase: './dist',
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Development',
      template: `src/snookweb/index.html`,
    }),
  ],
  output: {
    path: path.resolve(__dirname, 'dist'),
  },
};
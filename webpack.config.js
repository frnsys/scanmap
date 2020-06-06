var path = require('path');
const dev = process.env.NODE_ENV !== 'production';

module.exports = {
  entry: {
    main: './src/main',
    panel: './src/panel',
  },
  output: {
    path: path.resolve(__dirname, 'static/dist'),
    filename: '[name].js',
  },
  devtool: dev ? 'inline-source-map' : 'source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  corejs: 3,
                  shippedProposals: true,
                  useBuiltIns: 'usage',
                },
              ],
            ],
          },
        },
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(woff2?|ttf|eot|jpe?g|png|gif|svg)$/,
        loader: 'file-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.js'],
  },
  devServer: {
    writeToDisk: true,
  },
};

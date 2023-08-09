import * as path from 'path';
import * as webpack from 'webpack';
const SRC_DIR = path.join(__dirname, '/client/src');
const DIST_DIR = path.join(__dirname, '/client/out');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
import {GenerateSW} from 'workbox-webpack-plugin';
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
// const BundleAnalyzerPlugin =
//   require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

export default (
  _: any,
  {watch, mode}: {watch?: boolean, mode?: string}
): webpack.Configuration => {
  const maxBundleSize = mode === 'production' ? 780000 : 4200000;

  return {
    entry: `${SRC_DIR}/index.tsx`,
    output: {
      filename: '[name].[contenthash].js',
      path: DIST_DIR
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true
            }
          }
        }
      ]
    },
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
    },
    plugins: [
      new CleanWebpackPlugin(),
      new ForkTsCheckerWebpackPlugin(),
      new HtmlWebpackPlugin({
        template: `${SRC_DIR}/index.html`,
        publicPath: '/'
      }),
      new GenerateSW({
        navigateFallback: '/index.html',
        maximumFileSizeToCacheInBytes: maxBundleSize * 2
      })
      // new BundleAnalyzerPlugin() // Uncomment for bundle analysis
    ],
    performance: {
      maxAssetSize: maxBundleSize,
      maxEntrypointSize: maxBundleSize,
      hints: 'error'
    }
  };
};

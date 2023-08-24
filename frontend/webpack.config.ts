import * as path from 'path';
import * as webpack from 'webpack';
const SRC_DIR = path.join(__dirname, '/client/src');
const DIST_DIR = path.join(__dirname, '/client/out');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
import {EsbuildPlugin} from 'esbuild-loader';
import {GenerateSW} from 'workbox-webpack-plugin';
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
// const BundleAnalyzerPlugin =
//   require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const target = 'chrome80';

export default (
  _: any,
  {watch, mode}: {watch?: boolean, mode?: string}
): webpack.Configuration => {
  const maxBundleSize = mode === 'production' ? 840000 : 4400000;

  return {
    entry: `${SRC_DIR}/index.tsx`,
    output: {
      filename: '[name].[contenthash].js',
      path: DIST_DIR
    },
    module: {
      rules: [
        // Use esbuild to compile JavaScript & TypeScript
        {
          // Match `.js`, `.jsx`, `.ts` or `.tsx` files
          test: /\.[jt]sx?$/,
          loader: 'esbuild-loader',
          options: {
            // JavaScript version to compile to
            target
          }
        },
        {
          test: /\.(png|jpe?g|gif)$/i,
          loader: 'file-loader',
          options: {
            name: '[path][name].[ext]'
          }
        }
      ]
    },
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx']
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
    },
    optimization: {
        minimizer: [
            new EsbuildPlugin({
                // Syntax to transpile to (see options below for possible
                // values).
                target
            })
        ]
    }
  };
};

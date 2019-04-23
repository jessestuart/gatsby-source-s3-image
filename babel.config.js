module.exports = {
  compact: true,
  comments: false,
  sourceRoot: 'src/',
  ignore: ['./src/__tests__/*', './src/types/*'],
  presets: [
    [
      '@babel/preset-env',
      {
        // For more info on babel + core-js v3,
        // @see https://babeljs.io/blog/2019/03/19/7.4.0
        useBuiltIns: 'usage',
        corejs: 3,
      },
    ],
    '@babel/preset-typescript',
    'minify',
  ],
}

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: '(/__tests__/.*\\.([t]sx?)|(\\.|/)(test|spec))\\.([t]sx?)$',
  transform: {
    '^.+\\.js$': 'babel-jest',
    '.*\\.tsx?$': 'ts-jest',
  },
}

// module.exports = {
//   preset: 'ts-jest',
//   testEnvironment: 'node',
//   coverageDirectory: './test/coverage',
//   moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
//   moduleDirectories: ['src', 'node_modules'],
//   // setupFiles: ['<rootDir>/test/setupTests.ts'],
//   reporters: ['default', 'jest-junit'],
//   transform: {
//     '^.+\\.js$': 'babel-jest',
//     '.*\\.tsx?$': 'ts-jest',
//   },
//   testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.cache/'],
// }

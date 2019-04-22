module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: '(/__tests__/.*\\.([t]sx?)|(\\.|/)(test|spec))\\.([t]sx?)$',
  transform: { '^.+\\.tsx?$': 'ts-jest' },
}

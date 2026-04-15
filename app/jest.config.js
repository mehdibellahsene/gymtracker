module.exports = {
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/**/*.test.js'],
  coverageReporters: ['text', 'lcov'],
};

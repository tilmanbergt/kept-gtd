// Two projects: the unit tests, and the scenario tests that run the whole app against the fake
// device (test-helpers/fakeDevice, docs/dev/history/technical-design-quality-hardening.md §4).
// Coverage (npm run coverage, docs/dev/history/technical-design-test-tiers.md §3.5): every source file counts,
// also the ones no test loads; the summary feeds the area matrix (scripts/coverage-report.mjs), lcov is for reading.
module.exports = {
  collectCoverageFrom: ['App.tsx', 'src/**/*.{ts,tsx}', '!src/generated/**'],
  coverageReporters: ['json-summary', 'lcov'],
  projects: [
    {
      displayName: 'unit',
      preset: 'react-native',
      testPathIgnorePatterns: ['/node_modules/', '<rootDir>/__tests__/scenarios/'],
    },
    {
      displayName: 'scenarios',
      preset: 'react-native',
      testMatch: ['<rootDir>/__tests__/scenarios/**/*.test.ts?(x)'],
      setupFiles: ['<rootDir>/test-helpers/fakeDevice/setup.ts'],
    },
  ],
};

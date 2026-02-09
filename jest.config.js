module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/.*|sentry-expo|native-base|react-native-svg|@solana/.*|@solana-mobile/.*|@coral-xyz/.*|bn.js)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@canopyfi/sdk$': '<rootDir>/__mocks__/@canopyfi/sdk.ts',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/types/**'],
  // Coverage thresholds disabled - will enable once coverage improves
  // coverageThreshold: {
  //   global: {
  //     branches: 50,
  //     functions: 50,
  //     lines: 50,
  //     statements: 50,
  //   },
  // },
  globals: {
    __DEV__: true,
  },
};

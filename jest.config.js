module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  collectCoverageFrom: [
    "public/**/*.{ts,js}",
    "!public/turndown.js", // External library
    "!public/index.html",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  moduleNameMapper: {
    "^@logseq/libs$": "<rootDir>/tests/mocks/logseq.ts",
  },
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
}

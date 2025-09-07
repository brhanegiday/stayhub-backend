module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/src", "<rootDir>/__tests__"],
    testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
    transform: {
        "^.+\\.ts$": "ts-jest",
    },
    collectCoverage: true,
    coverageDirectory: "coverage",
    coverageReporters: ["text", "lcov", "html"],
    collectCoverageFrom: [
        "src/**/*.ts",
        "!src/app.ts",
        "!src/scripts/**",
        "!src/types/**",
        "!**/node_modules/**",
        "!**/coverage/**",
        "!**/dist/**",
    ],
    coverageThreshold: {
        global: {
            branches: 20,
            functions: 20,
            lines: 25,
            statements: 25,
        },
    },
    setupFilesAfterEnv: ["<rootDir>/__tests__/setup.ts"],
    testTimeout: 30000,
};

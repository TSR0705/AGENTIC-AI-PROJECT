import js from "@eslint/js";
import globals from "globals";

export default [
    {
        ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**"],
    },
    js.configs.recommended,
    {
        files: ["**/*.{js,jsx}"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.es2021,
            },
        },
        rules: {
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            "no-console": ["warn", { allow: ["warn", "error"] }],
            semi: ["error", "always"],
            quotes: ["error", "double", { avoidEscape: true }],
        },
    },
];

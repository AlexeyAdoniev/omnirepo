import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    ignores: ["dist/**", "node_modules/**"]
  },
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ["./tsconfig.json", "./tsconfig.test.json"],
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      "semi": ["error", "always"],
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_"
        }
      ]
    }
  }
];

import js from "@eslint/js";
import json from "@eslint/json";
import css from "@eslint/css";
import { defineConfig } from "eslint/config";

export default defineConfig({
  // ignore everything under the Foundry-provided folder so we don’t lint it
  ignorePatterns: ["foundry/**"],

  overrides: [
    {
      files: ["**/*.{js,mjs,cjs}"],
      plugins: { js },
      extends: ["js/recommended"],
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        globals: {
          game: "readonly",
          ui: "readonly",
          canvas: "readonly",
          Actor: "readonly",
          Item: "readonly",
          ChatMessage: "readonly",
          Macro: "readonly",
          User: "readonly",
          Scene: "readonly",
          Combat: "readonly",
          Combatant: "readonly",
          Folder: "readonly",
          Roll: "readonly",
          Hooks: "readonly",
          Handlebars: "readonly",
          CONFIG: "readonly",
          AudioHelper: "readonly",
          Dialog: "readonly",
          FormApplication: "readonly",
          Application: "readonly",
          FilePicker: "readonly",
          mergeObject: "readonly",
          duplicate: "readonly",
          foundry: "readonly",
          CONST: "readonly",
          renderTemplate: "readonly",
          getProperty: "readonly",
          setProperty: "readonly",
          expandObject: "readonly",
          isNewerVersion: "readonly",
          isObjectEmpty: "readonly",
          TextEditor: "readonly",
          randomID: "readonly",
          setTimeout: "readonly",
          setInterval: "readonly",
          clearTimeout: "readonly",
          clearInterval: "readonly",
          console: "readonly",
          getDocumentClass: "readonly",
          SortingHelpers: "readonly",
          fromUuid: "readonly"
        },
      },
      rules: {
        "no-console": "off",
        "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      },
    },
    { files: ["**/*.json"], plugins: { json }, language: "json/json", extends: ["json/recommended"] },
    { files: ["**/*.jsonc"], plugins: { json }, language: "json/jsonc", extends: ["json/recommended"] },
    { files: ["**/*.css"], plugins: { css }, language: "css/css", extends: ["css/recommended"] },
  ],
});

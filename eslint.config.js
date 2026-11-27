import js from '@eslint/js';
import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '.gmp_cache/**', 'src/**', 'tests/**', 'server.ts', 'vitest.config.ts', 'vite.config.ts'],
  },
  js.configs.recommended,
  firebaseRulesPlugin.configs['flat/recommended'],
];

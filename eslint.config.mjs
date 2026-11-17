// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

export default withNuxt(eslintPluginPrettierRecommended, {
  rules: {
    'prettier/prettier': ['error', { printWidth: 110, endOfLine: 'auto', trailingComma: 'none' }],
    'no-console': 'off',
    'no-async-promise-executor': 'off',
    // pre-existing pattern: store actions rethrow without `cause` (41 sites, unchanged behavior)
    'preserve-caught-error': 'off',
    // this codebase intentionally uses single-word component names (Page, Actions, Header…)
    'vue/multi-word-component-names': 'off',
    'vue/no-reserved-component-names': 'off',
    // store actions destructure the full vuex context even when partially used
    'no-unused-vars': [
      'error',
      {
        args: 'none',
        caughtErrors: 'none'
      }
    ]
  }
})

// Conventional Commits config. See CONTRIBUTING.md "Commits".
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // require an issue reference (the `refs: #<issue>` trailer)
    'references-empty': [2, 'never'],
  },
  // exempt commits that legitimately carry no issue reference; merges and
  // reverts are already covered by commitlint's defaultIgnores.
  ignores: [
    (message) => /^chore\(deps[^)]*\): /.test(message),
    (message) => /^chore\(release\): /.test(message),
  ],
};

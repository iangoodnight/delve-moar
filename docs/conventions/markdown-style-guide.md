# Markdown style guide

Conventions for markdown across the repo. No formatter reflows or lints
these docs, so the rules below are applied by hand and checked in review.

## Wrapping (the one that matters)

Where the file is read decides how it wraps:

- **Committed repo docs** (ADRs, READMEs, `docs/`, `CONTRIBUTING.md`):
  hard-wrap prose at ~70 columns. `.editorconfig` sets `max_line_length`
  for `*.md` as an advisory guide (honored by editors like Vim; not
  CI-enforced). They're read in editors and diffs, where fixed wrapping
  helps.
- **GitHub-surface text** (PR bodies, issue bodies, release notes, and
  PR/issue comments): leave each paragraph on one line, unwrapped. The
  GitHub UI soft-wraps it; hand-wrapping renders worse there.

## Formatting

- Fenced code blocks always carry a language hint (`ts`, `tsx`, `bash`,
  `json`, `text`), even for output samples.
- Headings in sentence case: `## Wrapping`, not `## Wrapping Rules`.
- `-` for bullet lists; `**bold**` and `_italic_`.
- Relative links between docs, absolute URLs for external resources.

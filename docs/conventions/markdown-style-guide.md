# Markdown style guide

Conventions for markdown across the repo. Prettier formats committed markdown,
so the wrapping rule below is enforced rather than left to habit: run
`task format:docs` to reflow, and a pre-commit hook and the CI `pre-commit` job
keep it consistent.

## Wrapping (the one that matters)

Where the file is read decides how it wraps:

- **Committed repo docs** (ADRs, READMEs, `docs/`, `CONTRIBUTING.md`): hard-wrap
  prose at 80 columns, matching the repo-wide width (the web Prettier
  `printWidth` and the API ruff `line-length` are both 80). Prettier enforces it
  with `proseWrap: always` and `printWidth: 80`, and `.editorconfig` sets a
  matching `max_line_length` for `*.md`. Tables and fenced code blocks are left
  alone; Prettier does not wrap their contents.
- **GitHub-surface text** (PR bodies, issue bodies, release notes, and PR/issue
  comments): leave each paragraph on one line, unwrapped. This text lives in
  GitHub, not in a committed file, so Prettier never sees it; the GitHub UI
  soft-wraps it and hand-wrapping renders worse there.

## Formatting

- Fenced code blocks always carry a language hint (`ts`, `tsx`, `bash`, `json`,
  `text`), even for output samples.
- Headings in sentence case: `## Wrapping`, not `## Wrapping Rules`.
- `-` for bullet lists; `**bold**` and `_italic_`.
- Relative links between docs, absolute URLs for external resources.

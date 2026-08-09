# Kettermean Project Instructions

## Prerelease workflow

Kettermean is in active prerelease development. Implementation requests carry standing authorization to commit and push completed, in-scope work without asking for a separate confirmation.

- Commit coherent progress periodically during long tasks and at meaningful milestones. Do not accumulate several completed user requests in one uncommitted working tree.
- Before handing off completed implementation work, commit it and push the current branch to `origin`.
- When working on `main`, push directly to `origin/main` unless the user specifically requests a feature branch or pull request.
- Do not stop with finished work merely described as “uncommitted” or “not pushed,” and do not ask whether to commit or push routine prerelease changes.
- Use terse, descriptive commit messages and report the resulting commit hash and push status.

## Verification

- Run the relevant automated checks before the final push. For repository-wide changes, prefer `npm run check` when feasible.
- Avoid repeatedly rerunning expensive checks when no relevant code changed.
- If an unrelated pre-existing failure prevents a clean check, commit and push the completed in-scope work when it is safe to do so, and report the failure clearly.

## Git guardrails

- Preserve unrelated user changes and keep commits scoped to the requested work.
- Never commit credentials, generated secrets, or local environment files.
- Do not force-push, rewrite published history, or delete remote branches unless the user explicitly asks.

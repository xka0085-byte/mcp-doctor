# Changelog

## 0.1.5 - Visibility release

- Reworked the README around the two real entry points: `schema` and `inspect`.
- Fixed the GitHub Action example to use `xka0085-byte/mcp-doctor@v1`.
- Added npm, CI and license badges, stable exit-code documentation, examples and feedback guidance.
- Added a copyable Secure MCP Server Starter workflow.
- Added task-oriented npm keywords for MCP schema and endpoint diagnostics.
- Kept the tool read-only: no tool calls, signing, payment, retries, or credentials.

Verification:

```bash
npm test
npm pack --dry-run
```

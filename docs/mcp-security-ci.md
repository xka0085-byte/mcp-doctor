# MCP Security CI

## Put a read-only check in every pull request

The mcpdoctor Action makes MCP schema and x402 preflight checks part of an existing GitHub workflow.

```yaml
name: MCP Trust Check

on:
  pull_request:
  workflow_dispatch:

jobs:
  mcp-trust:
    runs-on: ubuntu-latest
    steps:
      - uses: xka0085-byte/mcp-doctor@v1
        with:
          endpoint: https://your-mcp-server.example/mcp
          mode: schema
          format: markdown
          fail-on: true
```

Use `mode: inspect` for an x402 endpoint. The Action returns a non-zero status for `FAIL` and `UNKNOWN` by default, so a broken endpoint can block a merge. Set `fail-on: false` when introducing the check as an advisory signal.

## Important limits

This is not a full security scanner or certification. It does not invoke MCP tools, run arbitrary server commands, accept credentials, sign payments, or prove runtime behavior. Keep production credentials out of workflow inputs and point the check at a public test endpoint when possible.

See the [Action source](https://github.com/xka0085-byte/mcp-doctor/blob/main/action.yml) and [release notes](https://github.com/xka0085-byte/mcp-doctor/releases/tag/v0.1.5).

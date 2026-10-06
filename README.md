# mcpdoctor

Read-only checks for MCP tool schemas and x402 payment endpoints. Use it before an agent client or buyer depends on an endpoint.

[![npm](https://img.shields.io/npm/v/@eidonze/mcpdoctor?logo=npm)](https://www.npmjs.com/package/@eidonze/mcpdoctor)
[![CI](https://github.com/xka0085-byte/mcp-doctor/actions/workflows/ci.yml/badge.svg)](https://github.com/xka0085-byte/mcp-doctor/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Find the right guide

- [Public documentation site](https://xka0085-byte.github.io/mcp-doctor/)
- [MCP schema checker](docs/mcp-schema-checker.md)
- [x402 endpoint inspector](docs/x402-endpoint-inspector.md)
- [MCP security CI](docs/mcp-security-ci.md)
- [Troubleshooting](docs/troubleshooting.md)
- [OAuth scope and current limits](docs/mcp-oauth-diagnostics.md)

## Run it now

Check an MCP server without calling any tools:

```bash
npx @eidonze/mcpdoctor@0.1.5 schema https://your-mcp-server.example/mcp --json
```

Check an x402 endpoint without paying:

```bash
npx @eidonze/mcpdoctor@0.1.5 inspect https://your-api.example/paid --method=POST --json
```

Requires Node.js 18+. No API key or wallet is needed.

## Which command?

| Command | Checks | Does not do |
|---|---|---|
| `schema` | MCP `initialize`, `tools/list`, tool names, descriptions, and JSON schemas | Does not call tools or prove runtime behavior |
| `inspect` | HTTP 402, x402 v1/v2 payment document, `accepts[]`, discovery manifests, latency and response digest | Does not sign, pay, settle, retry, or verify delivery |

Exit codes are stable for automation: `0` PASS, `1` FAIL, `2` UNKNOWN/network error, `3` usage error.

## GitHub Actions

Add a read-only check to pull requests:

```yaml
name: MCP Trust Check
on: [pull_request]

jobs:
  mcp-trust:
    runs-on: ubuntu-latest
    steps:
      - uses: xka0085-byte/mcp-doctor@v1
        with:
          endpoint: https://your-mcp-server.example/mcp
          mode: schema
          format: markdown
```

Use `mode: inspect` for an x402 preflight. The action fails on `FAIL` or `UNKNOWN` by default; set `fail-on: false` for an informational check.

## Starter template

Start a new MCP project with this check already wired in:

- [Secure MCP Server Starter](examples/secure-mcp-server-starter/)

The check is read-only and should target a public test endpoint. Do not place private keys or credentials in workflow inputs.

## What the report means

`PASS` means the observed response matched the checks in this version. It is not a security audit, protocol certification, payment-success guarantee, or proof that an endpoint is safe. `UNKNOWN` means the endpoint could not be observed within the timeout or response-size limits.

Example schema failure:

```text
FAIL REQUIRED_PROPERTY_UNDEFINED tools[0] requires undeclared property query
```

Example x402 failure:

```text
FAIL NO_402 Expected HTTP 402, received 400
```

## Why it exists

The checks come from failure modes observed while building ReceiptRail: body validation that prevents an x402 challenge, payment documents in multiple headers/body shapes, and vendor hint headers that can hide the real `accepts[]` document.

mcpdoctor is not an MCP server. It is an independent, read-only endpoint inspector. It is not affiliated with mcpdoctor.dev; verify the npm scope is `@eidonze/mcpdoctor`.

## Feedback

Found a false positive or a protocol shape we should support? [Open an issue](https://github.com/xka0085-byte/mcp-doctor/issues). Include the command, redacted output, Node version, and whether the endpoint is MCP or x402. Never include tokens, payment signatures, or private URLs.

## License

MIT

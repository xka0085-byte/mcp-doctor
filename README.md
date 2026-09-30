# mcpdoctor

> ⚠️ **Official package notice**: this is the official `mcpdoctor`, published by npm user [`eidonze`](https://www.npmjs.com/~eidonze), repo [`xka0085-byte/mcp-doctor`](https://github.com/xka0085-byte/mcp-doctor). We are **NOT affiliated** with **mcpdoctor.dev** — that is a *different* product (an MCP **server-auditing** tool). This `mcpdoctor` is an independent, read-only **402/x402 payment-endpoint inspector CLI**. Same name, different tool. Verify the package by its scope: `@eidonze/mcpdoctor`.

**mcpdoctor is a read-only CLI for inspecting MCP and x402 endpoints.**

Point it at a URL, get one `PASS / FAIL / UNKNOWN` report:

- the **HTTP 402 payment document** — parsed from the known locations
  (`Payment-Required` / `X-Payment-Required` / `WWW-Authenticate` headers or
  the response body), in both x402 v1 (`accepts[]`) and v2 (`x402.accepts`)
  shapes, with every `scheme / network / asset / amount / payTo` field checked;
- the **discovery manifests** — whether `/.well-known/mcp/server.json` and
  `/.well-known/x402` are reachable, with a SHA-256 of each;
- a **SHA-256 digest** of the response body, plus latency and size.

mcpdoctor is **not an MCP server** and does not implement the MCP protocol.
It is the endpoint inspector you run *before* pointing an MCP client or an
x402 buyer at an endpoint — a preflight/debugging tool for AI-agent payment
infrastructure. Zero dependencies. Node ≥ 18. Never touches keys, never pays.

## Install

```bash
npm install -g @eidonze/mcpdoctor    # or run without installing:
npx @eidonze/mcpdoctor inspect <url>
```

## Usage

```bash
mcpdoctor inspect <url> [--method=GET|POST] [--format=json|markdown]
```

| Option | Default | Description |
|---|---|---|
| `--method` | `GET` | HTTP verb for the probe (`POST` sends `{}`) |
| `--format` | `markdown` | `json` for CI / machine-readable reports |
| `--json` | — | shorthand for `--format=json` |

Exit codes: `0` PASS · `1` FAIL · `2` UNKNOWN (network/timeout) · `3` usage error.

## Real examples (captured 2026-09-29, against live endpoints)

Inspecting an MCP endpoint that is free (no payment gate) — the tool reports
the 200 instead of a 402, and still verifies the discovery manifests:

```json
{
  "endpoint": "https://agenttoll-receipts.app.workbuddy.host/mcp",
  "method": "POST",
  "finalStatus": "FAIL",
  "http": { "status": 200, "elapsedMs": 2830, "bodyBytes": 82,
            "bodySha256": "598dc097dcca1e573c742100863899c00724a021b421a5bb49952d49fec6b4f4" },
  "findings": [
    { "status": "FAIL", "code": "NO_402", "message": "Expected HTTP 402, received 200" }
  ],
  "metadata": [
    { "path": "/.well-known/mcp/server.json", "status": 200, "reachable": true }
  ]
}
```

Inspecting the official x402 demo endpoint — it does return 402, but ships a
payment document mcpdoctor cannot parse, which is exactly the class of silent
breakage this CLI exists to catch:

```json
{
  "endpoint": "https://x402.org/protected",
  "finalStatus": "FAIL",
  "http": { "status": 402 },
  "headers": { "paymentRequired": true },
  "findings": [
    { "status": "FAIL", "code": "NO_ACCEPTS",
      "message": "No recognizable payment requirement found" }
  ]
}
```

## What it does NOT do

- No MCP protocol session: no `initialize`, no `tools/list` — mcpdoctor
  checks what an endpoint *advertises* (402 documents, discovery manifests),
  not a full MCP handshake.
- No wallet, signing, settlement, or retries. Read-only preflight only.
- `PASS` means the observed 402 document had recognizable, complete fields —
  it is not a security or payment-success certification.

## Why

We ship an x402 service ourselves ([ReceiptRail](https://github.com/xka0085-byte/agenttoll))
and hit every way a paid endpoint can silently break:

- an endpoint that validates the request body **before** returning the 402
  challenge is invisible to every x402 client — they only react to `402`;
- payment documents arrive in **four different places** and **two different
  shapes**; parsers that only look at one place report false failures;
- vendor hint headers without `accepts[]` can shadow the real payment document.

Each check in mcpdoctor maps to a failure mode we actually hit in production.

## Part of the Agent / Chain Evidence Tools suite

Read-only diagnostics for AI agents on Web3 —
[hub & docs](https://xka0085-byte.github.io/evidence-tools/) ·
[ReceiptRail (live MCP service)](https://github.com/xka0085-byte/agenttoll) ·
[npm: @eidonze/mcpdoctor](https://www.npmjs.com/package/@eidonze/mcpdoctor)

MIT licensed. Known limitations are documented, not hidden.

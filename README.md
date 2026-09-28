# mcpdoctor

Read-only preflight checks for **x402 payment endpoints** and **MCP servers**.
One command tells you whether your paid endpoint answers the way agent clients
actually expect — before a real buyer (human or AI) hits it.

Zero dependencies. Runs anywhere Node ≥ 18 runs. Never touches your keys.

```bash
npx @eidonze/mcpdoctor inspect https://your-endpoint/v1/paid --method=POST
```

## Why

Shipping an x402 service ourselves ([ReceiptRail](https://github.com/xka0085-byte/agenttoll)),
we hit every way a paid endpoint can silently break:

- an endpoint that validates the request body **before** returning the 402
  challenge is invisible to every x402 client — they only react to `402`;
- payment documents arrive in **four different places** (`Payment-Required` /
  `X-Payment-Required` / `WWW-Authenticate` headers, or the response body) and
  in **two different shapes** (v1 top-level `accepts[]`, v2 nested `x402.accepts`);
  parsers that only look at one place report false failures;
- vendor hint headers without `accepts[]` can shadow the real payment document.

Each check in mcpdoctor maps to a failure mode we actually hit in production.

## Usage

```bash
mcpdoctor inspect <url> [--method=GET|POST] [--format=json|markdown]
```

| Option | Default | Description |
|---|---|---|
| `--method` | `GET` | HTTP verb for the probe (`POST` sends `{}`) |
| `--format` | `markdown` | `json` for CI / machine-readable reports |

The report includes the observed HTTP status, the parsed payment requirements
(`accepts[]` with scheme / network / asset / amount / payTo / timeout), response
latency, size, a SHA-256 digest of the response bytes (tamper-evident record),
and reachability of `/.well-known/mcp/server.json` and `/.well-known/x402`.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | PASS — parseable 402 payment document with required fields |
| `1` | FAIL — endpoint responded but is not 402 / document incomplete |
| `2` | UNKNOWN — endpoint could not be observed within limits |
| `3` | invalid command |

## Verified, not vibes

- **Positive control**: passes against a production x402 service that itself
  survived x402scan's auditor (ReceiptRail, dual-network settlement).
- **Negative control**: the test suite spins up a server that returns `400`
  instead of `402` — the exact production bug that inspired this tool — and
  asserts mcpdoctor flags it (`NO_402`), plus a header-hint-shadowing case.

```bash
npm test
```

## Safety boundary

Read-only. mcpdoctor never signs, pays, retries payment, calls a facilitator,
or accepts a private key. A `PASS` is not a security audit, payment-success
certificate, or compliance decision — it means the observed 402 document had
recognizable, well-formed fields.

## Roadmap

- `extensions.bazaar` schema conformance (x402 Bazaar discovery listings)
- `x-payment-info.protocols` object-array check
- MCP streamable-HTTP `initialize` handshake check
- `/.well-known/mcp/server-card.json` (Smithery SEP-1649) validation

## Agent / Chain Evidence Tools — the suite

All tools are read-only, take no keys, and emit JSON.

| Tool | What it checks / proves | Try |
|---|---|---|
| [mcpdoctor](https://github.com/xka0085-byte/mcp-doctor) | x402 payment endpoint & MCP server preflight | `npx @eidonze/mcpdoctor` |
| [oauthdoctor](https://github.com/xka0085-byte/oauthdoctor) | MCP OAuth discovery diagnostics | `npx oauthdoctor` |
| [x402-reconcile](https://github.com/xka0085-byte/x402-reconcile) | x402 402-challenge inspector | `npx x402-reconcile` |
| [wallet-evidence](https://github.com/xka0085-byte/wallet-evidence) | Solana transaction evidence reports | `npx wallet-evidence` |
| [crosschain-incident](https://github.com/xka0085-byte/crosschain-incident) | cross-chain message incident normalization | `npx crosschain-incident` |
| [ReceiptRail](https://github.com/xka0085-byte/agenttoll) | on-chain x402 delivery receipts (Solana) | [live MCP endpoint](https://agenttoll-receipts.app.workbuddy.host/) |

Live tools page: <https://x402-endpoint-inspection.app.workbuddy.host/tools.html>

## License

MIT
---

## Suite hub

Part of the [Agent / Chain Evidence Tools](https://xka0085-byte.github.io/evidence-tools/) suite — read-only, no-keys, no-payments diagnostics for AI agents on Web3.

# x402 Endpoint Inspector

## Check an HTTP 402 endpoint without paying

`mcpdoctor inspect` sends a read-only request and checks whether an x402 endpoint returns a parseable payment challenge.

```bash
npx @eidonze/mcpdoctor@0.1.5 inspect https://your-api.example/paid --method=POST --json
```

It checks:

- HTTP status `402`;
- payment documents in supported headers or the response body;
- x402 v1 and v2 `accepts[]` shapes;
- scheme, network, asset, amount and payTo fields;
- discovery manifest reachability;
- response latency, size and SHA-256 digest.

A successful result means the observed challenge had recognizable fields. It does not pay, sign, settle, retry, verify delivery, or certify the seller.

## CI usage

```yaml
- uses: xka0085-byte/mcp-doctor@v1
  with:
    endpoint: https://your-api.example/paid
    mode: inspect
    format: markdown
```

## Failure example

```text
FAIL NO_402 Expected HTTP 402, received 400
```

Use the [npm package](https://www.npmjs.com/package/@eidonze/mcpdoctor) or inspect the [GitHub release](https://github.com/xka0085-byte/mcp-doctor/releases) for versioned installation details.

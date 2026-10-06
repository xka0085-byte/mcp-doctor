# Troubleshooting mcpdoctor

## `NO_402`

The endpoint returned a status other than HTTP 402. Confirm that you are probing the paid route, use the correct method, and send the request body expected by the service. `mcpdoctor` does not retry or pay.

```bash
mcpdoctor inspect https://your-api.example/paid --method=POST --json
```

## `NO_PAYMENT_DOCUMENT` or `NO_ACCEPTS`

The response did not contain a supported payment document. Check the response headers/body against the x402 version used by the service and confirm that `accepts[]` contains the required payment fields.

## `REQUIRED_PROPERTY_UNDEFINED`

A tool schema lists a required property that is not declared under `properties`. Fix the server's JSON Schema, then rerun:

```bash
mcpdoctor schema https://your-mcp-server.example/mcp --json
```

## `UNKNOWN` / `REQUEST_FAILED`

The endpoint could not be observed within the timeout or response-size limits, or the network request failed. Check reachability, TLS, DNS, rate limits and the endpoint URL. Do not add credentials to the command; this MVP is credential-free.

## Need help

Open a [GitHub issue](https://github.com/xka0085-byte/mcp-doctor/issues) with the command, redacted output, Node version and endpoint type. Never include secrets, tokens, signatures or private URLs.

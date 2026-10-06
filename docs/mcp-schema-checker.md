# MCP Schema Checker

## Check a server before an agent uses it

`mcpdoctor schema` performs a read-only MCP `initialize` request followed by `tools/list`. It checks the response shape and tool input schemas without invoking any tool.

```bash
npx @eidonze/mcpdoctor@0.1.5 schema https://your-mcp-server.example/mcp --json
```

It checks:

- protocol version in the initialize response;
- non-empty tool names and descriptions;
- object input schemas;
- declared properties;
- required properties that actually exist;
- property descriptions.

A schema `PASS` is a deterministic lint result. It does not certify authorization, runtime behavior, data quality, or security.

## GitHub Action

```yaml
- uses: xka0085-byte/mcp-doctor@v1
  with:
    endpoint: https://your-mcp-server.example/mcp
    mode: schema
    format: markdown
```

## Failure example

```text
FAIL REQUIRED_PROPERTY_UNDEFINED tools[0] requires undeclared property query
```

The checker does not call tools, send credentials, or execute server commands. See the [source repository](https://github.com/xka0085-byte/mcp-doctor) and [full schema limits](../SCHEMA-MVP.md).

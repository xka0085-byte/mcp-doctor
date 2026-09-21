#!/usr/bin/env node
import { createHash } from 'node:crypto';

const MAX_BODY = 1024 * 1024;
const TIMEOUT = 10_000;
const VERSION = '0.1.0';

const help = `mcpdoctor ${VERSION}

Read-only MCP/x402 endpoint diagnostics.

Usage:
  mcpdoctor inspect <url> [--method=GET|POST] [--format=json|markdown]
  mcpdoctor --help

This MVP never signs, pays, retries payment, or accepts a private key.`;

function die(message, code = 3) {
  console.error(`Error: ${message}\n\n${help}`);
  process.exitCode = code;
}

function redact(value) {
  return typeof value === 'string'
    ? value.replace(/(authorization|signature|token|api[_-]?key)\s*[:=]\s*[^,\s}]+/gi, '$1: [REDACTED]').replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')
    : value;
}

async function readBody(response) {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) { await reader.cancel(); throw new Error(`response body exceeds ${MAX_BODY} bytes`); }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function headersOf(headers) {
  return Object.fromEntries([...headers].map(([key, value]) => [key.toLowerCase(), redact(value)]));
}

function json(text) { try { return JSON.parse(text); } catch { return null; } }

function findPaymentDocument(headers, body) {
  const candidates = [headers['payment-required'], headers['x-payment-required'], headers['www-authenticate'], body].filter(Boolean);
  const parsed = [];
  for (const candidate of candidates) {
    const direct = json(candidate);
    if (direct && typeof direct === 'object') { parsed.push(direct); continue; }
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const nested = json(candidate.slice(start, end + 1));
      if (nested) parsed.push(nested);
    }
  }
  if (!parsed.length) return null;
  // headers like x-payment-required may carry vendor hints without accepts[] —
  // prefer the candidate that actually contains payment requirements
  return parsed.find((d) => requirements(d).length > 0) ?? parsed[0];
}

function requirements(document) {
  if (!document || typeof document !== 'object') return [];
  // x402 v2 canonical shape: { x402: { version: 2, accepts: [...] } }
  if (document.x402 && Array.isArray(document.x402.accepts)) return document.x402.accepts;
  if (Array.isArray(document.accepts)) return document.accepts;
  if (Array.isArray(document.paymentRequirements?.accepts)) return document.paymentRequirements.accepts;
  if (document.paymentRequirements && typeof document.paymentRequirements === 'object') return [document.paymentRequirements];
  if (document.challenge && typeof document.challenge === 'object') return [document.challenge];
  return [];
}

function normalize(item) {
  return {
    scheme: item.scheme ?? null,
    network: item.network ?? item.chain ?? null,
    asset: item.asset ?? item.mint ?? null,
    amount: item.amount ?? item.maxAmountRequired ?? null,
    payTo: item.payTo ?? item.vendor ?? item.recipient ?? null,
    maxTimeoutSeconds: item.maxTimeoutSeconds ?? null,
  };
}

async function probe(url, method = 'GET') {
  const started = Date.now();
  const init = { method, redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT), headers: { accept: 'application/json, application/problem+json, text/plain' } };
  if (method === 'POST') { init.headers['content-type'] = 'application/json'; init.body = '{}'; }
  const response = await fetch(url, init);
  const body = await readBody(response);
  const headers = headersOf(response.headers);
  return { response, body, headers, elapsedMs: Date.now() - started };
}

async function metadata(base, path) {
  try {
    const result = await probe(new URL(path, base).toString(), 'GET');
    return { path, status: result.response.status, reachable: result.response.ok, bodySha256: createHash('sha256').update(result.body).digest('hex'), bodyBytes: Buffer.byteLength(result.body) };
  } catch (error) { return { path, status: null, reachable: false, error: redact(error.message) }; }
}

function makeReport(url, method, result) {
  const { response, body, headers, elapsedMs } = result;
  const document = findPaymentDocument(headers, body);
  const accepts = requirements(document).map(normalize);
  const findings = [];
  if (response.status !== 402) findings.push({ status: 'FAIL', code: 'NO_402', message: `Expected HTTP 402, received ${response.status}` });
  if (!document) findings.push({ status: 'FAIL', code: 'NO_PAYMENT_DOCUMENT', message: 'No parseable payment document in known headers or body' });
  if (document && !accepts.length) findings.push({ status: 'FAIL', code: 'NO_ACCEPTS', message: 'No recognizable payment requirement found' });
  for (const [index, item] of accepts.entries()) for (const field of ['scheme', 'network', 'asset', 'amount', 'payTo']) if (!item[field]) findings.push({ status: 'FAIL', code: `MISSING_${field.toUpperCase()}`, message: `accepts[${index}] is missing ${field}` });
  const digest = createHash('sha256').update(body).digest('hex');
  return { reportVersion: 1, inspectorVersion: VERSION, mode: 'read-only', checkedAt: new Date().toISOString(), endpoint: url, method, finalStatus: response.status === 402 && document && accepts.length && !findings.length ? 'PASS' : 'FAIL', http: { status: response.status, elapsedMs, contentType: headers['content-type'] ?? null, bodyBytes: Buffer.byteLength(body), bodySha256: digest }, headers: { paymentRequired: Boolean(headers['payment-required'] || headers['x-payment-required']), wwwAuthenticate: Boolean(headers['www-authenticate']) }, x402: { version: document?.x402Version ?? null, resource: document?.resource ?? null, accepts }, findings, limitations: ['Read-only preflight only; no wallet, signing, settlement, or post-payment delivery was attempted.', 'PASS means the observed 402 document had recognizable fields; it is not a security, payment-success, or content-quality certification.'] };
}

function markdown(report) {
  const lines = [`# mcpdoctor report`, '', `- Status: **${report.finalStatus}**`, `- Endpoint: ${report.endpoint}`, `- HTTP: ${report.http.status}`, `- Response: ${report.http.elapsedMs} ms / ${report.http.bodyBytes} bytes`, `- Body SHA-256: \`${report.http.bodySha256}\``, '', '## Payment requirements', ''];
  if (!report.x402.accepts.length) lines.push('- None parsed', '');
  report.x402.accepts.forEach((item, i) => lines.push(`### accepts[${i}]`, '', ...Object.entries(item).map(([key, value]) => `- ${key}: ${value ?? 'missing'}`), ''));
  lines.push('## Findings', '', ...(report.findings.length ? report.findings.map((item) => `- **${item.status}** \`${item.code}\`: ${item.message}`) : ['- None']), '', '## Limitations', '', ...report.limitations.map((item) => `- ${item}`), '');
  return lines.join('\n');
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.length === 0) { console.log(help); process.exitCode = args.length ? 0 : 3; }
else if (args[0] !== 'inspect') die('only the inspect command is available in this MVP');
else {
  const rawUrl = args[1];
  const method = (args.find((arg) => arg.startsWith('--method='))?.split('=')[1] ?? 'GET').toUpperCase();
  const format = args.find((arg) => arg.startsWith('--format='))?.split('=')[1] ?? (args.includes('--json') ? 'json' : 'markdown');
  if (!rawUrl) die('URL is required');
  else if (!['GET', 'POST'].includes(method)) die('--method must be GET or POST');
  else if (!['json', 'markdown'].includes(format)) die('--format must be json or markdown');
  else {
    let url;
    try { url = new URL(rawUrl); if (!['http:', 'https:'].includes(url.protocol)) throw new Error('only http(s) URLs are supported'); }
    catch (error) { die(error.message); }
    if (url) try {
      const result = await probe(url, method);
      const report = makeReport(url.toString(), method, result);
      report.metadata = await Promise.all(['/.well-known/mcp/server.json', '/.well-known/x402'].map((path) => metadata(url, path)));
      process.stdout.write(format === 'json' ? `${JSON.stringify(report, null, 2)}\n` : markdown(report));
      process.exitCode = report.finalStatus === 'PASS' ? 0 : 1;
    } catch (error) {
      const report = { reportVersion: 1, inspectorVersion: VERSION, mode: 'read-only', checkedAt: new Date().toISOString(), endpoint: url.toString(), finalStatus: 'UNKNOWN', findings: [{ status: 'UNKNOWN', code: 'REQUEST_FAILED', message: redact(error.message) }], limitations: ['The endpoint could not be observed within the timeout/body limit. No payment was attempted.'] };
      process.stdout.write(format === 'json' ? `${JSON.stringify(report, null, 2)}\n` : markdown(report));
      process.exitCode = 2;
    }
  }
}

#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'bin', 'mcpdoctor.mjs');
const server = createServer((request, response) => {
  if (request.url === '/good') {
    response.writeHead(402, { 'content-type': 'application/json', 'payment-required': JSON.stringify({ x402Version: 2, accepts: [{ scheme: 'exact', network: 'eip155:8453', asset: 'USDC', amount: '10000', payTo: '0x1234567890123456789012345678901234567890' }] }) });
    response.end(JSON.stringify({ x402Version: 2, accepts: [{ scheme: 'exact', network: 'eip155:8453', asset: 'USDC', amount: '10000', payTo: '0x1234567890123456789012345678901234567890' }] }));
    return;
  }
  // regression (found against production ReceiptRail): a hint header WITHOUT accepts[]
  // must not shadow the real payment document in the body
  if (request.url === '/header-hint') {
    response.writeHead(402, { 'content-type': 'application/json', 'x-payment-required': JSON.stringify({ vendor: 'VendorHintNoAccepts', amount: '1000', decimals: 6 }) });
    response.end(JSON.stringify({ x402Version: 2, resource: { url: 'x', description: 'd', mimeType: 'application/json' }, accepts: [{ scheme: 'exact', network: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1', amount: '1000', asset: 'MINT', payTo: 'PayToAddr' }] }));
    return;
  }
  // regression (our original production bug): body validation must not shadow the 402
  if (request.url === '/bad-400') {
    response.writeHead(400, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'missing body param' }));
    return;
  }
  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ error: 'not found' }));
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const port = server.address().port;

function run(url, ...args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, 'inspect', url, '--format=json', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

try {
  const good = await run(`http://127.0.0.1:${port}/good`);
  assert.equal(good.code, 0, good.stderr);
  assert.equal(JSON.parse(good.stdout).finalStatus, 'PASS');
  const bad = await run(`http://127.0.0.1:${port}/missing`);
  assert.equal(bad.code, 1, bad.stderr);
  assert.equal(JSON.parse(bad.stdout).finalStatus, 'FAIL');
  const hint = await run(`http://127.0.0.1:${port}/header-hint`, '--method=POST');
  assert.equal(hint.code, 0, hint.stderr);
  const hintReport = JSON.parse(hint.stdout);
  assert.equal(hintReport.finalStatus, 'PASS', JSON.stringify(hintReport.findings));
  assert.equal(hintReport.x402.accepts.length, 1, 'body accepts[] must win over accept-less header hints');
  const bad400 = await run(`http://127.0.0.1:${port}/bad-400`, '--method=POST');
  assert.equal(bad400.code, 1, bad400.stderr);
  const bad400Report = JSON.parse(bad400.stdout);
  assert.equal(bad400Report.finalStatus, 'FAIL');
  assert.ok(bad400Report.findings.some((f) => f.code === 'NO_402'), 'must flag 400-instead-of-402');
  const help = await new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, '--help'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; child.stdout.on('data', (chunk) => { stdout += chunk; }); child.on('close', (code) => resolve({ code, stdout }));
  });
  assert.equal(help.code, 0);
  assert.match(help.stdout, /mcpdoctor/);
  console.log('mcpdoctor smoke tests passed');
} finally {
  server.close();
}

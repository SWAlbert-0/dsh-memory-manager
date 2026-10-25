import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Tests the optional live-model adapter with a synthetic loopback provider.
// This is transport/tool-loop verification, NOT an actual model quality result.
const root = await mkdtemp(join(tmpdir(), 'dsh-memory-eval-adapter-'));
let requests = 0;
const server = createServer(async (req, res) => {
  try {
    assert.equal(req.url, '/v1/chat/completions');
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const input = JSON.parse(Buffer.concat(chunks).toString('utf8')); requests++;
    assert.equal(input.model, 'synthetic-tool-loop');
    assert.deepEqual(input.tools.map(t => t.function.name), ['memory_search', 'memory_list']);
    const result = input.messages.find(m => m.role === 'tool');
    const message = result
      ? { role: 'assistant', content: '请确认。' + JSON.parse(result.content).memories.map(r => r.text).join('；') }
      : { role: 'assistant', content: null, tool_calls: [{ id: 'read-1', type: 'function', function: { name: 'memory_list', arguments: '{"limit":100}' } }] };
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message }], usage: { prompt_tokens: 10, completion_tokens: 5 } }));
  } catch (error) { res.writeHead(500); res.end(error.message); }
});
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const reportPath = join(root, 'report.json');
  const child = spawn(process.execPath, [fileURLToPath(new URL('./phase1-eval.mjs', import.meta.url)), reportPath], {
    env: { ...process.env, DSH_MEMORY_EVAL_LIVE: '1', DSH_MEMORY_EVAL_BASE_URL: `http://127.0.0.1:${server.address().port}/v1`, DSH_MEMORY_EVAL_MODEL: 'synthetic-tool-loop', DSH_MEMORY_EVAL_API_KEY: '' }, stdio: 'ignore',
  });
  const exit = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  assert.equal(exit, 0);
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  assert.equal(requests, 24); assert.equal(report.modelCalls, 24); assert.equal(report.actualModelTokens, 360);
  assert.equal(report.liveModel.answerCheckPassRate, 1);
  assert.ok(report.cases.every(c => c.live.trace[0].tool === 'memory_list'));
  assert.equal(report.overall.positiveQueries, 11); assert.equal(report.overall.negativeQueries, 1);
  console.log('PASS optional live-eval adapter: 12 scenarios, 24 synthetic requests, read-only tools, usage accounting and positive/negative metric separation');
} finally {
  await new Promise(resolve => server.close(resolve));
  assert.ok(root.startsWith(join(tmpdir(), 'dsh-memory-eval-adapter-'))); await rm(root, { recursive: true, force: true });
}

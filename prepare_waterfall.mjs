import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const snapshotPath = 'E:/project/dsh-multica-monitor/design-previews/2026-11-05-monitor-v2/snapshot.json';
const source = await readFile(snapshotPath, 'utf8');
const snapshot = JSON.parse(source.replace(/^\uFEFF/, ''));
const runId = Object.keys(snapshot.messages).find(id => id.endsWith('d1701910'));
const run = Object.values(snapshot.issues).flatMap(issue => issue.runs).find(run => run.id === runId);
const { buildRunWaterfall } = await import(pathToFileURL('E:/project/dsh-multica-monitor-git/prototype/src/run-waterfall.mjs'));
const data = buildRunWaterfall({ run, messages: snapshot.messages[runId].messages, partial: snapshot.messages[runId].hasMore });
const output = {
  source: { capturedAt: snapshot.capturedAt, snapshotSha256: createHash('sha256').update(source).digest('hex'), demo: false },
  run: { id: run.id, issue: 'CXTE-4', issueTitle: run.issueTitle, agentName: run.agentName, status: run.status, startedAt: run.startedAt, completedAt: run.completedAt },
  start: data.start, end: data.end, total: data.total, rawCount: data.rawCount, complete: data.complete,
  totals: data.totals, rows: data.rows,
};
await writeFile(new URL('./public/waterfall-data.json', import.meta.url), JSON.stringify(output));
console.log(JSON.stringify({ run: runId, logs: data.rawCount, rows: data.rows.length, complete: data.complete, bytes: Buffer.byteLength(JSON.stringify(output)) }));

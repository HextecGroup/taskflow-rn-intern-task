#!/usr/bin/env node
/**
 * Mock sync backend launcher (json-server) for TaskFlow — Candidate Code: AA-RN-9722.
 *
 *   npm run server              start on 0.0.0.0:3000 (creates db.json from the seed if missing)
 *   npm run server:reset        restore db.json from scripts/db.seed.json, then start
 *   PORT=4000 npm run server    custom port
 *
 * Binding to 0.0.0.0 makes the API reachable from emulators and physical devices on the same Wi-Fi.
 * `--watch` reloads db.json when edited by hand (useful to demo Last-Write-Wins conflicts).
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DB_FILE = path.join(ROOT, 'db.json');
const SEED_FILE = path.join(__dirname, 'db.seed.json');
const PORT = process.env.PORT || '3000';
const HOST = process.env.HOST || '0.0.0.0';

const args = process.argv.slice(2);
const reset = args.includes('--reset');
const passThrough = args.filter((arg) => arg !== '--reset');

if (reset || !fs.existsSync(DB_FILE)) {
  fs.copyFileSync(SEED_FILE, DB_FILE);
  console.log(`db.json ${reset ? 'reset' : 'created'} from scripts/db.seed.json`);
}

try {
  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  if (!Array.isArray(db.tasks)) throw new Error('"tasks" must be an array');
} catch (error) {
  console.error(`db.json is invalid: ${error.message}\nRun "npm run server:reset" to restore the seed data.`);
  process.exit(1);
}

const lanAddresses = Object.values(os.networkInterfaces())
  .flat()
  .filter((net) => net && (net.family === 'IPv4' || net.family === 4) && !net.internal)
  .map((net) => net.address);

const line = '─'.repeat(64);
console.log(`\n${line}\n TaskFlow mock sync server   ·   Candidate Code: AA-RN-9722\n${line}`);
console.log(` Local / iOS simulator : http://localhost:${PORT}/tasks`);
console.log(` Android emulator      : http://10.0.2.2:${PORT}/tasks`);
lanAddresses.forEach((address) => console.log(` Physical device (LAN) : http://${address}:${PORT}/tasks`));
console.log(` The app auto-detects the Expo dev machine IP; override it in Settings → Sync & server.\n${line}\n`);

const bin = require.resolve('json-server/lib/cli/bin.js');
const child = spawn(process.execPath, [bin, '--watch', DB_FILE, '--host', HOST, '--port', PORT, ...passThrough], {
  stdio: 'inherit',
});

child.on('exit', (code) => process.exit(code ?? 0));
['SIGINT', 'SIGTERM'].forEach((signal) => process.on(signal, () => child.kill(signal)));

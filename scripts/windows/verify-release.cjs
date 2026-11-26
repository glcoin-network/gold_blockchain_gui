const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const release = require('./release-2.0.6-6.json');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
for (const [relative, expected] of Object.entries(release.assets)) {
  assert.equal(sha256(fs.readFileSync(path.join(root, relative))), expected, relative);
}
for (const relative of ['package.json', 'packages/gui/package.json']) {
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, relative))).version, release.application_version);
}
assert.deepEqual(
  fs.readFileSync(path.join(root, 'packages/gui/public/favicon.ico')),
  fs.readFileSync(path.join(root, 'packages/gui/src/assets/img/gold.ico')),
);
for (const relative of [
  'packages/icons/src/images/gold.svg', 'packages/gui/src/assets/img/gold_logo.svg',
]) {
  const svg = fs.readFileSync(path.join(root, relative), 'utf8');
  const embedded = [...svg.matchAll(/href="data:image\/png;base64,([^"]+)"/g)];
  assert.equal(embedded.length, 1, relative);
  assert.equal(sha256(Buffer.from(embedded[0][1], 'base64')), release.rendered_logo_png_sha256);
}
const include = fs.readFileSync(path.join(root, 'packages/gui/safe-per-user-mode.nsh'), 'utf8');
assert(include.includes("KERNEL32::lstrcpynW(w .r0, p r2, i ${NSIS_MAX_STRLEN})p"));
assert(!include.includes('*$2(&w${NSIS_MAX_STRLEN}'));
const template = fs.readFileSync(path.join(root, 'packages/gui/installer.nsh'), 'utf8');
assert.equal(template.split('!include "${GOLD_SAFE_PER_USER_MODE_INCLUDE}"').length, 3);
console.log('Asset hashes, embedded logos, versions, and installer hooks passed.');

const compiler = process.argv[2];
if (compiler) {
  assert.equal(process.platform, 'win32', 'The NSIS regression must execute on Windows');
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'gold-shell-path-'));
  for (const variant of ['old', 'fixed']) {
    const args = ['/V2', `/DPROBE_DIR=${output}`, `/DPROBE_VARIANT=${variant}`];
    if (variant === 'fixed') args.push('/DFIX_SHELL_PATH_COPY');
    args.push(path.join(__dirname, 'shell-path-probe.nsi'));
    const compilation = spawnSync(compiler, args, { encoding: 'utf8', windowsHide: true, timeout: 30000 });
    assert.ifError(compilation.error);
    assert.equal(compilation.status, 0, compilation.stdout + compilation.stderr);
    const execution = spawnSync(path.join(output, `shell-path-${variant}.exe`), [], {
      encoding: 'utf8', windowsHide: true, timeout: 15000,
    });
    assert.ifError(execution.error);
    const trace = fs.readFileSync(path.join(output, `shell-path-${variant}.log`), 'utf8');
    if (variant === 'old') assert.equal(execution.status >>> 0, 0xc0000005);
    else {
      assert.equal(execution.status, 0);
      assert(trace.includes('copied=[C:\\Programs]'));
    }
  }
  console.log(`Guarded-memory regression passed. Probe artifacts: ${output}`);
}

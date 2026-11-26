const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '../..');
const gui = path.join(root, 'packages/gui');
const release = require('./release-2.0.6-6.json');
const [, , payloadArg, outputArg] = process.argv;
if (!payloadArg || !outputArg) {
  throw new Error('Usage: node scripts/windows/build-installer.cjs <win-unpacked> <output-directory>');
}
const payload = fs.realpathSync(payloadArg);
const output = path.resolve(outputArg);
assert(fs.existsSync(path.join(payload, 'Gold.exe')), 'Expected a prebuilt Gold Windows application');
assert(fs.existsSync(path.join(payload, 'resources/app.asar')), 'Missing application archive');
assert(!output.startsWith(payload + path.sep) && output !== payload, 'Output must be outside the payload');
const requireBuilder = createRequire(path.join(process.env.GOLD_BUILDER_ROOT || root, 'package.json'));
const { build, Platform, Arch } = requireBuilder('electron-builder');

function manifest(directory, relative = '') {
  return fs.readdirSync(path.join(directory, relative), { withFileTypes: true }).flatMap((entry) => {
    const name = path.join(relative, entry.name);
    if (entry.isDirectory()) return manifest(directory, name);
    assert(!entry.isSymbolicLink(), `Unexpected link in application payload: ${name}`);
    const bytes = fs.readFileSync(path.join(directory, name));
    return [{ name, sha256: crypto.createHash('sha256').update(bytes).digest('hex') }];
  }).sort((left, right) => left.name.localeCompare(right.name));
}

async function main() {
  const before = manifest(payload);
  const icon = path.join(gui, 'src/assets/img/gold.ico');
  await build({
    projectDir: gui,
    prepackaged: payload,
    targets: Platform.WINDOWS.createTarget('nsis', Arch.x64),
    publish: 'never',
    config: {
      appId: 'net.glcoin.blockchain',
      productName: 'Gold',
      buildVersion: release.windows_build_version,
      buildNumber: '6',
      directories: { output },
      win: { executableName: 'Gold', icon },
      nsis: {
        artifactName: 'GoldSetup-2.0.6-6.exe',
        oneClick: false,
        installerIcon: icon,
        uninstallerIcon: icon,
        include: path.join(gui, 'installer.nsh'),
        license: path.join(gui, 'LICENSE'),
        deleteAppDataOnUninstall: false,
        allowToChangeInstallationDirectory: true,
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
      },
    },
  });
  assert.deepEqual(manifest(payload), before, 'Installer build changed the application payload');
  const installer = path.join(output, 'GoldSetup-2.0.6-6.exe');
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(installer)).digest('hex');
  fs.writeFileSync(`${installer}.sha256`, `${sha256}  ${path.basename(installer)}\n`);
  console.log(JSON.stringify({ installer, sha256, verifiedPayloadFiles: before.length }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

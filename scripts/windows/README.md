# Windows 2.0.6-6

Application version: `2.0.6`. Installer build version: `2.0.6.6`.

This update contains the bounded-copy NSIS fix for the per-user installation
directory and the logo assets used in the delivered `GoldSetup-2.0.6-6.exe`.
The installer and uninstaller both load the safe path-copy macro.

The source PNG, window icon, ICO/favicon, and embedded renderer logo are included.
The original macOS icon and unrelated illustrations are unchanged.

## Verify

From the repository root:

```powershell
node scripts/windows/verify-release.cjs
node scripts/windows/verify-release.cjs C:\path\to\nsis\Bin\makensis.exe
```

The second command runs a standalone guarded-memory regression. The old copy
must fail with `0xc0000005`; the bounded copy must return the complete path.
It does not install Gold or access wallet data. Probe files are retained in
the temporary directory printed by the script.

## Package

Build the GUI from these sources with the 2.0.6 backend, then prepare an Electron
Windows x64 application directory containing `Gold.exe` and `resources/app.asar`.
The source PNGs and SVG must be included during that GUI build; this installer
script does not replace assets inside an already-built application.

With `electron-builder` available (the delivered installer used version 24.13.3):

```powershell
node scripts/windows/build-installer.cjs C:\path\to\win-unpacked C:\path\to\output
```

Set `GOLD_BUILDER_ROOT` to a directory containing `package.json` and an installed
`electron-builder` dependency if using an external build-tools environment.
The script packages the prebuilt application, verifies its files were not
changed, and writes a SHA256 file. Code signing and timestamps can change
the rebuilt executable's hash; the manifest records the delivered artifact.

No backend consensus, wallet synchronization, or staking code lives in these
GUI changes. Those updates are maintained in `glcoin-network/gold_blockchain`.

const fs = require('node:fs');
const path = require('node:path');

const KEEP_WIN_LOCALES = new Set(['en-US.pak', 'zh-CN.pak', 'zh-TW.pak']);
const KEEP_MAC_LOCALES = new Set(['en.lproj', 'en_GB.lproj', 'zh_CN.lproj', 'zh_TW.lproj']);

function removeExcept(directory, shouldKeep) {
  if (!fs.existsSync(directory)) return;

  for (const entry of fs.readdirSync(directory)) {
    if (shouldKeep(entry)) continue;
    fs.rmSync(path.join(directory, entry), { recursive: true, force: true });
  }
}

exports.default = async function pruneElectronPackage(context) {
  const { appOutDir, electronPlatformName } = context;

  if (electronPlatformName === 'win32' || electronPlatformName === 'linux') {
    removeExcept(path.join(appOutDir, 'locales'), (entry) => KEEP_WIN_LOCALES.has(entry));
    return;
  }

  if (electronPlatformName === 'darwin') {
    const frameworkResources = path.join(
      appOutDir,
      'CinnaTool.app',
      'Contents',
      'Frameworks',
      'Electron Framework.framework',
      'Versions',
      'A',
      'Resources',
    );

    removeExcept(frameworkResources, (entry) => !entry.endsWith('.lproj') || KEEP_MAC_LOCALES.has(entry));
  }
};

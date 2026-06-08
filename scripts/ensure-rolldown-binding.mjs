/**
 * Vite 8 uses rolldown native bindings; npm often skips them as optional deps.
 * Install the binding for this OS/arch if missing.
 */
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { arch, platform } from "node:os";

const BINDING_VERSION = "1.0.0-rc.15";
const require = createRequire(import.meta.url);

const bindingPackage = (() => {
  if (platform() === "darwin") {
    return `@rolldown/binding-darwin-${arch() === "arm64" ? "arm64" : "x64"}`;
  }
  if (platform() === "linux") {
    return `@rolldown/binding-linux-${arch() === "arm64" ? "arm64-gnu" : "x64-gnu"}`;
  }
  if (platform() === "win32") {
    return `@rolldown/binding-win32-${arch() === "arm64" ? "arm64-msvc" : "x64-msvc"}`;
  }
  return null;
})();

if (!bindingPackage) {
  process.exit(0);
}

try {
  require.resolve(bindingPackage);
  process.exit(0);
} catch {
  console.log(`[postinstall] Installing missing ${bindingPackage}…`);
  execSync(`npm install ${bindingPackage}@${BINDING_VERSION} --no-save --no-fund --no-audit`, {
    stdio: "inherit",
  });
}

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(root, "assets");
const dataDir = path.join(root, "public", "data");
const maptex = path.join(dataDir, "maptex", "base.png");
const images = path.join(dataDir, "marker-images");

if (fs.existsSync(maptex) && fs.existsSync(images) && fs.readdirSync(images).length > 100) {
  console.log("offline data ready");
  process.exit(0);
}

const parts = fs
  .readdirSync(assets)
  .filter((f) => f.startsWith("offline-data.tar.zst."))
  .sort();
if (parts.length === 0) {
  console.error("missing assets/offline-data.tar.zst.* parts");
  process.exit(1);
}

const merged = path.join(assets, "offline-data.tar.zst");
const out = fs.openSync(merged, "w");
for (const p of parts) {
  fs.writeSync(out, fs.readFileSync(path.join(assets, p)));
}
fs.closeSync(out);

fs.mkdirSync(dataDir, { recursive: true });

const cmd = "zstd -d -c assets/offline-data.tar.zst | tar -xf - -C public/data";
const res = spawnSync(cmd, {
  cwd: root,
  shell: true,
  stdio: "inherit",
  env: process.env,
});
fs.unlinkSync(merged);

if (res.status !== 0) {
  console.error("unpack failed");
  process.exit(res.status || 1);
}
console.log("unpacked offline data");

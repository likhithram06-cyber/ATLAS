/**
 * Downloads the AR House GLB into public/models/house.glb
 *
 * Option 1 — Objaverse (no Sketchfab account needed):
 *   pip install objaverse
 *   python -c "import objaverse, shutil; u='a8325d8a22ac42128e83780222809365'; p=list(objaverse.load_objects(uids=[u]).values())[0]; shutil.copy(p,'public/models/house.glb')"
 *
 * Option 2 — Sketchfab API token:
 *   SKETCHFAB_API_TOKEN=your_token node scripts/download-house-model.mjs
 *
 * Option 3 — Manual download from Sketchfab and save as public/models/house.glb
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const MODEL_UID = "a8325d8a22ac42128e83780222809365";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../public/models");
const OUT_GLB = path.join(OUT_DIR, "house.glb");

fs.mkdirSync(OUT_DIR, { recursive: true });

// Try Objaverse first (works without Sketchfab auth)
function tryObjaverse() {
  try {
    execSync(
      `python -c "import objaverse, shutil; u='${MODEL_UID}'; p=list(objaverse.load_objects(uids=[u]).values())[0]; shutil.copy(p, r'${OUT_GLB.replace(/\\/g, "\\\\")}')"`,
      { stdio: "pipe" }
    );
    return fs.existsSync(OUT_GLB) && fs.statSync(OUT_GLB).size > 100000;
  } catch {
    return false;
  }
}

if (tryObjaverse()) {
  console.log(`Saved via Objaverse → ${OUT_GLB} (${fs.statSync(OUT_GLB).size} bytes)`);
  process.exit(0);
}

const token = process.env.SKETCHFAB_API_TOKEN;
if (!token) {
  console.error(
    "Could not download via Objaverse (pip install objaverse) and no SKETCHFAB_API_TOKEN set.\n" +
      "Manual: https://sketchfab.com/3d-models/ar-house-a8325d8a22ac42128e83780222809365\n" +
      "Save as frontend/public/models/house.glb"
  );
  process.exit(1);
}

const metaRes = await fetch(
  `https://api.sketchfab.com/v3/models/${MODEL_UID}/download`,
  { headers: { Authorization: `Token ${token}` } }
);

if (!metaRes.ok) {
  console.error(`Sketchfab API error ${metaRes.status}:`, await metaRes.text());
  process.exit(1);
}

const meta = await metaRes.json();
const downloadUrl = meta.glb?.url || meta.gltf?.url;
if (!downloadUrl) {
  console.error("No download URL in response:", meta);
  process.exit(1);
}

console.log("Downloading from Sketchfab...");
const fileRes = await fetch(downloadUrl);
if (!fileRes.ok) {
  console.error(`Download failed ${fileRes.status}`);
  process.exit(1);
}

const buf = Buffer.from(await fileRes.arrayBuffer());

if (meta.glb?.url) {
  await fs.promises.writeFile(OUT_GLB, buf);
  console.log(`Saved ${OUT_GLB} (${buf.length} bytes)`);
} else {
  const zipPath = path.join(OUT_DIR, "house.zip");
  const extractDir = path.join(OUT_DIR, "house-tmp");
  await fs.promises.writeFile(zipPath, buf);
  fs.mkdirSync(extractDir, { recursive: true });
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`,
    { stdio: "inherit" }
  );
  const findGlb = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = findGlb(full);
        if (found) return found;
      } else if (entry.name.endsWith(".glb")) {
        return full;
      }
    }
    return null;
  };
  const glbPath = findGlb(extractDir);
  if (glbPath) {
    fs.copyFileSync(glbPath, OUT_GLB);
    console.log(`Extracted GLB → ${OUT_GLB}`);
  } else {
    const houseDir = path.join(OUT_DIR, "house");
    fs.rmSync(houseDir, { recursive: true, force: true });
    fs.renameSync(extractDir, houseDir);
    console.log(`Extracted GLTF folder → ${houseDir}`);
    console.log("Update HouseModel.jsx path to: /models/house/scene.gltf");
  }
  fs.unlinkSync(zipPath);
  if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
}

console.log("Done.");

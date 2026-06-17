#!/usr/bin/env node
// What this file does: One-command project setup for new machines.
// Run with: node setup.js
//
// It will:
//   1. Install backend dependencies
//   2. Install frontend dependencies
//   3. Check if property images exist — if not, guide the user
//   4. Seed the MongoDB database with 12 properties
//
// USAGE:
//   cd ATLAS
//   node setup.js

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const BACKEND = path.join(ROOT, "backend");
const FRONTEND = path.join(ROOT, "frontend");
const IMAGES_DIR = path.join(FRONTEND, "public", "images");

const REQUIRED_FOLDERS = ["exterior", "bedroom", "bathroom", "kitchen", "living_room"];

function log(msg) {
  console.log(`\n✦ ${msg}`);
}

function run(cmd, cwd) {
  console.log(`  → ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit" });
}

// ── Step 1: Install dependencies ────────────────────────────────────────────
log("Installing backend dependencies...");
run("npm install", BACKEND);

log("Installing frontend dependencies...");
run("npm install", FRONTEND);

// ── Step 2: Check for .env ──────────────────────────────────────────────────
const envPath = path.join(BACKEND, ".env");
if (!fs.existsSync(envPath)) {
  console.log("\n⚠️  No .env file found in backend/");
  console.log("   Copy .env.example to .env and fill in your secrets:");
  console.log("   cp backend/.env.example backend/.env");
  console.log("   Then re-run: node setup.js\n");
  process.exit(1);
}

// ── Step 3: Check for dataset images ────────────────────────────────────────
log("Checking for property images...");

const missingFolders = REQUIRED_FOLDERS.filter((folder) => {
  const folderPath = path.join(IMAGES_DIR, folder);
  if (!fs.existsSync(folderPath)) return true;
  const files = fs.readdirSync(folderPath).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
  return files.length === 0;
});

if (missingFolders.length > 0) {
  console.log("\n⚠️  Some image folders are missing or empty:");
  missingFolders.forEach((f) => console.log(`     - frontend/public/images/${f}/`));
  console.log("\n   To get the images, you have two options:");
  console.log("   Option 1: Copy 'frontend/public/images/' from the original machine.");
  console.log("   Option 2: Run the Kaggle downloader (requires Python + kagglehub):");
  console.log("             cd backend && python download_dataset.py\n");
  console.log("   The seed script will still run, but property cards will show placeholders.\n");
}

// ── Step 4: Seed the database ───────────────────────────────────────────────
log("Seeding MongoDB with property listings...");
run("node seed.js", BACKEND);

// ── Done ────────────────────────────────────────────────────────────────────
console.log("\n" + "═".repeat(60));
console.log("  ✅  ATLAS setup complete!");
console.log("═".repeat(60));
console.log("\n  To start the app:\n");
console.log("    Terminal 1 (backend):   cd backend && npm run dev");
console.log("    Terminal 2 (frontend):  cd frontend && npm run dev\n");
console.log("  Then open: http://localhost:5173\n");

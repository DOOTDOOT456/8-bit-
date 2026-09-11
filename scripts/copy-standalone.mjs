// Copies the single-file build output to a portable HTML file at project root
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";

// Read the standalone build
const html = readFileSync("dist/index.html", "utf8");

// The standalone build is already a single file, just copy it
copyFileSync("dist/index.html", "emberfall.html");

console.log("✓ Standalone game written to emberfall.html (" + (html.length / 1024).toFixed(1) + " KB)");
console.log("✓ Run: open emberfall.html in any browser");

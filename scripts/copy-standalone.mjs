// Copies the single-file build output to a portable HTML file at project root
import { copyFileSync } from "node:fs";
copyFileSync("dist/index.html", "emberfall.html");
console.log("✓ Standalone game written to emberfall.html");

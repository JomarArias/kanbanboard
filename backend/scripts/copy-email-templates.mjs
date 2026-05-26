import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.resolve(__dirname, "../src/templates/emails");
const targetDir = path.resolve(__dirname, "../build/src/templates/emails");

await mkdir(targetDir, { recursive: true });
await cp(sourceDir, targetDir, { recursive: true });

console.log(`[build] Copied email templates: ${sourceDir} -> ${targetDir}`);

import { mkdirSync, copyFileSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "public", "demo");

mkdirSync(outDir, { recursive: true });

const demoIndexHtml = readFileSync(join(root, "demo", "index.html"), "utf8");
const indexHtml = demoIndexHtml
  .replace('src="../src/pipeline/scenarios.js"', 'src="./scenarios.js"')
  .replace('src="../src/pipeline/speechPipeline.js"', 'src="./speechPipeline.js"');
writeFileSync(join(outDir, "index.html"), indexHtml);

copyFileSync(join(root, "demo", "app.js"), join(outDir, "app.js"));
copyFileSync(join(root, "demo", "styles.css"), join(outDir, "styles.css"));
copyFileSync(join(root, "src", "pipeline", "scenarios.js"), join(outDir, "scenarios.js"));
copyFileSync(join(root, "src", "pipeline", "speechPipeline.js"), join(outDir, "speechPipeline.js"));

console.log("Copied demo to public/demo/");

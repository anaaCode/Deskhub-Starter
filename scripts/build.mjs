import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await cp(path.join(root, "public"), dist, { recursive: true });
await cp(path.join(root, "src"), path.join(dist, "src"), { recursive: true });
await cp(path.join(root, "db.json"), path.join(dist, "db.json"));

const htmlFiles = ["index.html", "dashboard.html", "tickets.html", "ticket-detail.html"];

for (const file of htmlFiles) {
  const filePath = path.join(dist, file);
  let html = await readFile(filePath, "utf8");
  html = html.replaceAll("../src/main.js", "./src/main.js");
  await writeFile(filePath, html);
}

console.log("Built static site to dist/");

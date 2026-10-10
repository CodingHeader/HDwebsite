import fs from "fs";

const files = [
  ".next/server/app/about.html",
  ".next/server/app/campus.html",
  ".next/server/app/contact.html",
];

for (const f of files) {
  if (fs.existsSync(f)) {
    const content = fs.readFileSync(f, "utf8");
    const cssRefs = content.match(/href="[^"]*\.css[^"]*"/g) || [];
    console.log(`${f} CSS refs: ${cssRefs.length}`);
    cssRefs.slice(0, 3).forEach((r) => console.log(`  ${r}`));
    break;
  }
}

import { readFile, writeFile } from 'fs/promises';
import { glob } from 'glob';

const files = await glob('src/app/api/**/route.ts', { cwd: process.cwd() });

let fixedCount = 0;

for (const file of files) {
  const content = await readFile(file, 'utf-8');
  
  // Fix create calls
  const newContent = content
    .replace(/\.create\(\{\s*data:\s*([^}]+)\s*\}\)/g, '.create({ data: $1 as any })')
    .replace(/\.create\(\{\s*data:\s*result\.data\s*\}\)/g, '.create({ data: result.data as any })')
    .replace(/\.create\(\{\s*data:\s*parsed\.data\s*\}\)/g, '.create({ data: parsed.data as any })')
    .replace(/\.create\(\{\s*data:\s*data\s*\}\)/g, '.create({ data: data as any })');
  
  if (content !== newContent) {
    await writeFile(file, newContent, 'utf-8');
    console.log(`Fixed: ${file}`);
    fixedCount++;
  }
}

console.log(`Fixed ${fixedCount} files`);

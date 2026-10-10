import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const dbPath = path.resolve(process.cwd(), 'prisma', 'dev.db');
const db = new DatabaseSync(dbPath);

// 修复编码
try {
  const result = db.exec(`
    UPDATE ManagerMenu SET label = '对话日志' WHERE code = 'conversations';
  `);
  console.log('修复完成');
  
  // 验证
  const stmt = db.prepare('SELECT code, label FROM ManagerMenu WHERE code = ?');
  const row = stmt.get('conversations');
  console.log('查询结果:', row);
  
  // 检查是否为 UTF-8
  const label = row.label;
  console.log('Label:', label);
  console.log('Char codes:', [...label].map(c => c.charCodeAt(0).toString(16)).join(' '));
} catch (err) {
  console.error('错误:', err);
} finally {
  db.close();
}

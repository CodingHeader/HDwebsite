// P03 prompt 验证脚本的等价修正版：原脚本在 shell 单引号内写 "\\\\s*"，JS 得到 \\s*（匹配字面反斜杠），任何权限都判 missing。
const fs=require("fs"),cp=require("child_process");
const used=new Set(cp.execSync(`grep -rhoE 'requireAuth\\([^)]*"[a-z]+:[a-z]+"' src/app/api || true`).toString().match(/[a-z]+:[a-z]+/g)||[]);
const src=fs.readFileSync("src/contracts/auth.ts","utf8");
const miss=[...used].filter(p=>{const [m,a]=p.split(":");const r=new RegExp("\\b"+m+":\\s*\\[[^\\]]*\""+a+"\"");return !r.test(src)});
console.log("used",[...used].length,"missing perms:",miss); process.exit(miss.length?1:0)

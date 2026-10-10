import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const apis = [
  {
    path: 'api/settings/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const settings = await prisma.setting.findMany();
  const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
  return NextResponse.json(success(map));
}
`
  },
  {
    path: 'api/chat/completion/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();
    
    const config = await prisma.aIConfig.findFirst({ where: { isActive: true } });
    if (!config) {
      return NextResponse.json(error("AI未配置"), { status: 503 });
    }
    
    const res = await fetch(config.apiEndpoint + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": \`Bearer \${config.apiKey}\`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }),
    });
    
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "抱歉，我无法回答。";
    
    return NextResponse.json(success({ reply }));
  } catch (err) {
    return NextResponse.json(error("AI调用失败"), { status: 500 });
  }
}
`
  },
  {
    path: 'api/auth/me/route.ts',
    content: `import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { success } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.response) return auth.response;
  return NextResponse.json(success(auth.user));
}
`
  }
];

const baseDir = path.join(process.cwd(), 'src', 'app');

for (const api of apis) {
  const fullPath = path.join(baseDir, api.path);
  const dir = path.dirname(fullPath);
  
  await mkdir(dir, { recursive: true });
  await writeFile(fullPath, api.content, 'utf-8');
  console.log(`Created: ${api.path}`);
}

console.log('API creation complete!');

/** E2E 环境常量（被测应用、mock 上游端口与账号） */
import path from "node:path";

export const ROOT = path.resolve(__dirname, "../../..");
export const E2E_PORT = Number(process.env.E2E_PORT ?? 6791);
export const MOCK_PORT = Number(process.env.E2E_MOCK_PORT ?? 6799);
export const E2E_BASE_URL = `http://127.0.0.1:${E2E_PORT}`;
export const MOCK_BASE_URL = `http://127.0.0.1:${MOCK_PORT}`;
export const E2E_DB_FILE = path.join(ROOT, "prisma", "e2e.db");
export const ADMIN = { username: "admin", password: "admin123" };
export const VIEWER = { username: "e2e-viewer", password: "viewer123" };
/** mock LLM 固定回复（流式按字切分下发） */
export const MOCK_REPLY = "您好！自考报名一般在每年3月和9月，具体以当地考试院通知为准。";

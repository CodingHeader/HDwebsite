/**
 * 前台视觉回归（P02 / REQ-F-014）：upgrade 前台与 main 参照截图逐像素比对，maxDiffPixelRatio ≤ 0.01。
 * 稳定化：固定时间与时区、禁用动画、隐藏光标、滚动触发懒加载后回顶、等待字体与图片、
 * 隐藏 upgrade 新增的悬浮元素（[data-visual-ignore]，如 ChatWidget）。
 */
import { expect, test, type Page } from "@playwright/test";
import { MAIN_HOME_BLOCK_ORDER, ROUTES, VIEWPORTS, resolvePath } from "./routes";

const IS_REF = process.env.VISUAL_REF === "1";
const FIXED_TIME = new Date("2026-05-01T10:00:00+08:00");

/**
 * V14-VIS-STAB-01：图片就绪判定。
 *
 * flake 已确诊（非样式回归）：`48eb0b2` 与 `9efa2f5` 的 git tree 哈希同为
 * `991586f45016fdf5dc616249701058d25581f046`，CI run `40454848846` success、
 * `40455661938` failure —— 同一份代码两次运行结果相反。故问题在时序，不在像素阈值。
 *
 * 三条正交时序源，一次性收敛（不放宽任何阈值）：
 *  a. 轮询 200ms→100ms，且要求**连续 2 次**轮询都达标才返回：
 *     单次达标可能只是恰好赶上某个渲染帧，复查一次可滤掉瞬时状态。
 *  b. 就绪条件补 `currentSrc !== ""`：`next/image` 的 srcset 会让 currentSrc
 *     晚于 decode 落定，只判 complete 会在「已解码但未选定源」的窗口里通过。
 *  c. 截图前双 requestAnimationFrame（见 settle）：decode→合成→绘制至少跨两帧。
 *
 * 返回结构化诊断，供调用方写进 stdout —— CI 日志即可判定失败性质，
 * 不必下载需认证的 artifact（D1：日志 403 / artifact 401 / gh 未安装）。
 */
interface ImageState {
  total: number;
  loaded: number;
  /** 未就绪图片的 currentSrc 尾部，最多 5 条 */
  missing: string[];
}

async function waitForLoadedImages(page: Page): Promise<ImageState> {
  const deadline = Date.now() + 15_000;
  let consecutiveOk = 0;
  let last: ImageState = { total: 0, loaded: 0, missing: [] };

  for (;;) {
    // ⚠️ decode 必须**在页面上下文内**调用。上一版把 `decode: () => img.decode()`
    // 作为对象字段从 evaluate 返回，返回值要跨进程序列化、函数会被丢弃 →
    // `TypeError: img.decode is not a function`（CI run 40453526485 的 home@1440）。
    const state = await page.evaluate(async () => {
      const imgs = Array.from(document.images).filter((img) => !img.closest("[data-visual-ignore]"));
      await Promise.all(
        imgs.map((img) =>
          img.complete && img.naturalWidth > 0 ? Promise.resolve() : img.decode().catch(() => undefined)
        )
      );
      const ready = (i: HTMLImageElement) =>
        i.complete && i.naturalWidth > 0 && i.currentSrc !== "";
      const missing = imgs
        .filter((i) => !ready(i))
        .slice(0, 5)
        .map((i) => (i.currentSrc || i.getAttribute("src") || "(no src)").slice(-60));
      return { total: imgs.length, loaded: imgs.filter(ready).length, missing };
    });

    last = state;

    if (state.loaded === state.total) {
      consecutiveOk += 1;
      if (consecutiveOk >= 2) return state;
    } else {
      consecutiveOk = 0;
    }

    // 真加载失败时走超时 → 截图空白 → diff 响亮失败（语义不变，不是豁免）
    if (Date.now() >= deadline) return last;
    await page.waitForTimeout(100);
  }
}

async function settle(page: Page, label: string) {
  await page.addStyleTag({
    content: `[data-visual-ignore]{visibility:hidden !important}
      *,*::before,*::after{transition:none !important;animation:none !important;caret-color:transparent !important}
      html{scroll-behavior:auto !important}`,
  });
  // 触发懒加载：逐屏滚动到底再回顶
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  // 有限等待网络空闲（Link 预取不存在的路由可能长时间挂起，不能无限等待）
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  // V9-VIS-03 补强（run 39990249476 实证）：懒加载 + next/image 优化器冷启动在 CI 上
  // 偶发超过下方逐图 3s 兜底 → 截图里图片区空白、像素门禁假红（home@1440 的 gallery/
  // campus 图块 10% 像素差）。这里在 Node 侧确定性等待所有非忽略图片**解码完成**
  // （naturalWidth>0），15s 上限；真加载失败时走超时→截图空白→diff 失败，仍是响亮的失败信号。
  const images = await waitForLoadedImages(page);
  await page.evaluate(async () => {
    await Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map((img) => new Promise((r) => { img.onload = img.onerror = r; setTimeout(r, 3000); }))
    );
  });
  // V14-VIS-STAB-01(b)：decode 完成 ≠ 已合成绘制。截图前跨两帧，
  // 让「解码 → 布局 → 合成」走完一轮，避免拍到中间态。
  await page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
  );
  await page.waitForTimeout(300);
  // V14-VIS-STAB-01：失败自解释。CI 日志里直接可判定失败性质，
  // 不依赖需认证的 artifact（下载为 401）。形如：
  //   [visual] home@1440 images=42/42 OK
  //   [visual] home@1440 images=40/42 MISSING=[.../banner-1.webp, .../campus-3.webp]
  const ok = images.loaded === images.total;
  console.log(
    `[visual] ${label} images=${images.loaded}/${images.total} ${ok ? "OK" : `MISSING=[${images.missing.join(", ")}]`}`
  );
  if (!ok) {
    test.info().annotations.push({
      type: "images-not-ready",
      description: `${label}: ${images.loaded}/${images.total} 未就绪 → ${images.missing.join(", ")}`,
    });
  }
}

for (const vp of VIEWPORTS) {
  test.describe(`web @${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const route of ROUTES) {
      test(`${route.name} @${vp.name}`, async ({ page }) => {
        await page.clock.setFixedTime(FIXED_TIME);
        const target = await resolvePath(page, route);
        await page.goto(target, { waitUntil: "load" });
        await settle(page, `${route.name}@${vp.name}`);
        await expect(page).toHaveScreenshot(`${route.name}-${vp.name}.png`, { fullPage: true });
        // 可选：保存实际截图，供 scripts 外的差异比例统计（证据表）使用
        if (process.env.VISUAL_SAVE_ACTUAL && !IS_REF) {
          await page.screenshot({
            path: `.cache/visual/actual/${route.name}-${vp.name}.png`,
            fullPage: true,
            animations: "disabled",
            caret: "hide",
          });
        }
      });
    }
  });
}

test("首页含 Banner 轮播且区块顺序与 main 一致（data-block 锚点）", async ({ page }) => {
  test.skip(IS_REF, "main 参照站点无 data-block 锚点，仅在 upgrade 上断言");
  await page.goto("/", { waitUntil: "load" });
  const codes = await page.$$eval("[data-block]", (els) => els.map((e) => e.getAttribute("data-block")));
  expect(codes).toEqual(MAIN_HOME_BLOCK_ORDER);
  // Banner 轮播区块在首位且有可见内容
  await expect(page.locator('[data-block="home-banner"] section').first()).toBeVisible();
});

// @vitest-environment jsdom
/**
 * E-04 KbUpload 组件测试（ADR-025）：选择 .pdf/.png → 不发请求并显示 KB_REJECT_MESSAGE（后端同款中文提示）；
 * 合法文件 → 以 KB_UPLOAD_FIELD 发起 multipart 请求；超数量/超大小拦截。
 * C-06 未合并前 fetch mock（端点路径 /api/knowledge-bases/{baseId}/files）。
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { KbUpload } from "@/app/manager/knowledge-bases/kb-upload";
import { KB_REJECT_MESSAGE, KB_UPLOAD_FIELD } from "@/contracts/kb";

afterEach(cleanup);

vi.mock("@/components/manager/feedback", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/components/manager/feedback")>();
  return { ...orig, toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } };
});

vi.mock("@/store/authStore", () => ({
  useAuthStore: { getState: () => ({ token: "test-token" }) },
}));

function file(name: string, size = 100): File {
  return new File(["x".repeat(size)], name, { type: "application/octet-stream" });
}

async function chooseFiles(files: File[]) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, "files", { value: files, configurable: true });
  fireEvent.change(input);
}

describe("E-04 KbUpload 白名单拦截（ADR-025）", () => {
  it("选择 .pdf → 不发请求并显示 KB_REJECT_MESSAGE", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ code: 200 }), { status: 200 }));
    const onUploaded = vi.fn();
    render(<KbUpload baseId={1} onUploaded={onUploaded} />);

    await chooseFiles([file("doc.pdf")]);

    // 不发请求
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(onUploaded).not.toHaveBeenCalled();
    // 后端同款中文提示
    const alert = screen.getByTestId("kb-upload-reject");
    expect(alert.textContent).toContain(KB_REJECT_MESSAGE);
    fetchSpy.mockRestore();
  });

  it("选择 .png → 不发请求并显示 KB_REJECT_MESSAGE", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ code: 200 }), { status: 200 }));
    render(<KbUpload baseId={1} onUploaded={vi.fn()} />);

    await chooseFiles([file("img.png")]);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("kb-upload-reject").textContent).toContain(KB_REJECT_MESSAGE);
    fetchSpy.mockRestore();
  });

  it("合法 .md 文件 → 以 KB_UPLOAD_FIELD 发起 multipart 请求", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ code: 200, data: [] }), { status: 200 }));
    const onUploaded = vi.fn();
    render(<KbUpload baseId={7} onUploaded={onUploaded} />);

    await chooseFiles([file("guide.md")]);

    await waitFor(() => expect(onUploaded).toHaveBeenCalled());
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/knowledge-bases/7/files");
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).body).toBeInstanceOf(FormData);
    expect(((init as RequestInit).body as FormData).get(KB_UPLOAD_FIELD)).toBeTruthy();
    expect(screen.queryByTestId("kb-upload-reject")).toBeNull();
    fetchSpy.mockRestore();
  });

  it("合法与非法混合 → 仅合法文件发请求，非法显示提示", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ code: 200, data: [] }), { status: 200 }));
    render(<KbUpload baseId={1} onUploaded={vi.fn()} />);

    await chooseFiles([file("a.md"), file("b.pdf"), file("c.jpg")]);

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    const form = (fetchSpy.mock.calls[0][1] as RequestInit).body as FormData;
    expect(form.getAll(KB_UPLOAD_FIELD)).toHaveLength(1);
    expect(screen.getByTestId("kb-upload-reject").textContent).toContain(KB_REJECT_MESSAGE);
    fetchSpy.mockRestore();
  });

  it("超过单次 10 个 → 拦截不发请求", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ code: 200 }), { status: 200 }));
    render(<KbUpload baseId={1} onUploaded={vi.fn()} />);

    await chooseFiles(Array.from({ length: 11 }, (_, i) => file(`f${i}.md`)));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("kb-upload-reject").textContent).toContain("单次最多 10 个");
    fetchSpy.mockRestore();
  });

  it("超过 10MB → 拦截并提示单文件上限", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ code: 200 }), { status: 200 }));
    render(<KbUpload baseId={1} onUploaded={vi.fn()} />);

    await chooseFiles([file("big.md", 10 * 1024 * 1024 + 1)]);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("kb-upload-reject").textContent).toContain("单文件上限 10MB");
    fetchSpy.mockRestore();
  });
});

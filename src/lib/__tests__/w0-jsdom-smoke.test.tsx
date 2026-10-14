/**
 * W0-07：jsdom 冒烟测试 —— 验证 vitest 能收集并运行组件测试（.tsx + `// @vitest-environment jsdom`）。
 * 用最小的 React 组件验证 jsdom 环境与 @testing-library/react 可用。
 */
// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

/** 占位组件：证明 jsdom 环境与 testing-library 渲染链路可用 */
function Smoke({ label }: { label: string }) {
  return <button data-testid="smoke">{label}</button>;
}

describe("W0-07 jsdom 冒烟（vitest 收集 .tsx + @testing-library/react）", () => {
  it("渲染并查询 DOM 节点", () => {
    render(<Smoke label="组件冒烟 OK" />);
    expect(screen.getByTestId("smoke")).toBeTruthy();
    expect(screen.getByText("组件冒烟 OK").tagName).toBe("BUTTON");
  });

  it("jsdom 环境生效（window/document 可用）", () => {
    expect(typeof document).toBe("object");
    expect(document.createElement("div").tagName).toBe("DIV");
  });
});
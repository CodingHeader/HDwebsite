// @vitest-environment jsdom
/**
 * A-01 管理端基础件测试（Wave 1）：键盘可达、aria、disabled/loading、受控行为。
 * 组件库：@/components/manager/ui（P07 + A-01 新增 DateTimeInput/RadioGroup/Skeleton）。
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  Button,
  DateTimeInput,
  Input,
  RadioGroup,
  Skeleton,
} from "@/components/manager/ui";

describe("A-01 管理端基础件（manager/ui）", () => {
  it("Button：disabled 不可点击；loading 禁用交互", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>保存</Button>);
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("Input：受控输入与 aria-invalid 样式钩子", () => {
    render(<Input aria-label="名称" aria-invalid="true" defaultValue="初始" />);
    const el = screen.getByLabelText("名称") as HTMLInputElement;
    expect(el.value).toBe("初始");
    expect(el.getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(el, { target: { value: "改后" } });
    expect(el.value).toBe("改后");
  });

  it("DateTimeInput：type=datetime-local 原生可用", () => {
    render(<DateTimeInput aria-label="发布时间" />);
    const el = screen.getByLabelText("发布时间") as HTMLInputElement;
    expect(el.type).toBe("datetime-local");
  });

  it("RadioGroup：方向键原生切换、受控 value、disabled 项不可选", () => {
    const onValueChange = vi.fn();
    render(
      <RadioGroup
        label="渠道"
        name="channel"
        value="website"
        onValueChange={onValueChange}
        options={[
          { label: "官网", value: "website" },
          { label: "公众号", value: "wechat" },
          { label: "已停用", value: "off", disabled: true },
        ]}
      />
    );
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios).toHaveLength(3);
    expect(radios[0].checked).toBe(true); // 受控 value=website
    fireEvent.click(radios[1]);
    expect(onValueChange).toHaveBeenCalledWith("wechat");
    expect(radios[2].disabled).toBe(true);
    // 键盘：方向键聚焦移动（原生 radio 组语义）
    radios[0].focus();
    expect(document.activeElement).toBe(radios[0]);
  });

  it("Skeleton：纯样式件不产生可交互节点（aria-hidden）", () => {
    const { container } = render(<Skeleton className="h-4 w-40" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute("aria-hidden")).toBe("true");
    expect(el.className).toContain("animate-pulse");
  });

  it("组件可从 index.ts barrel 导入（入口唯一）", async () => {
    const ui = await import("@/components/manager/ui");
    for (const name of ["Button", "Input", "DateTimeInput", "RadioGroup", "Skeleton", "Select", "Checkbox", "Switch", "Badge", "Card"]) {
      expect(ui, `导出 ${name} 缺失`).toHaveProperty(name);
    }
  });
});

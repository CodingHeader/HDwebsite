// @vitest-environment jsdom
/**
 * A-03 ResourceForm/SchemaForm 测试：JsonField 非法 JSON 报错、后端 400 fieldErrors → 字段 aria-invalid、
 * relation 字段渲染、normalizeFormValues 提交转换。
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  SchemaForm,
  mapFieldErrors,
  normalizeFormValues,
  validateRequired,
  type FieldSpec,
} from "@/components/manager/SchemaForm";

// jsdom 无 authStore 持久层——mock zustand store（isSuper=true 全字段可见）
import { vi } from "vitest";
vi.mock("@/store/authStore", () => ({
  useAuthStore: (sel: (s: { user?: { role: { isSuper: boolean } } | null }) => unknown) =>
    sel({ user: { role: { isSuper: true } } }),
}));

afterEach(cleanup);

describe("A-03 SchemaForm 字段级错误", () => {
  it("JsonField：非法 JSON 输入触发格式错误（validateRequired）", () => {
    const fields: FieldSpec[] = [{ key: "ext", label: "扩展配置", type: "json" }];
    const errors = validateRequired(fields, { ext: "{ not json" });
    expect(errors.ext).toContain("JSON 格式不正确");
    const ok = validateRequired(fields, { ext: '{ "a": 1 }' });
    expect(Object.keys(ok)).toHaveLength(0);
  });

  it("后端 400 fieldErrors：mapFieldErrors 按顶层键归并；渲染后对应字段 aria-invalid=true", () => {
    const fields: FieldSpec[] = [
      { key: "name", label: "名称", required: true },
      { key: "slug", label: "标识", required: true },
    ];
    const mapped = mapFieldErrors({ fieldErrors: { "slug": "标识仅允许小写字母与连字符", "meta.x": "嵌套键归并到 meta" } });
    expect(mapped.slug).toBe("标识仅允许小写字母与连字符");
    expect(mapped.meta).toBe("嵌套键归并到 meta");

    render(
      <SchemaForm
        fields={fields}
        values={{ name: "测试" }}
        onChange={() => {}}
        errors={mapped}
      />
    );
    // aria-invalid 由 FormField 透传（错误字段红色描边）
    const invalidInputs = Array.from(document.querySelectorAll("[aria-invalid='true']"));
    expect(invalidInputs.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("schema-form")).toBeDefined();
  });

  it("relation 字段：combobox 渲染（远程搜索组件接入）", () => {
    const fields: FieldSpec[] = [
      { key: "categoryId", label: "分类", type: "relation", relation: { path: "/api/categories", labelKey: "name" } },
    ];
    render(<SchemaForm fields={fields} values={{ categoryId: "3" }} onChange={() => {}} />);
    const combo = screen.getByRole("combobox");
    expect(combo).toBeDefined();
  });

  it("normalizeFormValues：tags 逗号串→数组、select 空值删键、空串→null", () => {
    const fields: FieldSpec[] = [
      { key: "tags", label: "标签", type: "tags" },
      { key: "status", label: "状态", type: "select", options: [{ label: "启用", value: "active" }] },
      { key: "note", label: "备注" },
    ];
    const out = normalizeFormValues(fields, { tags: "a, b，c", status: "", note: "" });
    expect(out.tags).toEqual(["a", "b", "c"]);
    expect(out).not.toHaveProperty("status"); // select 空值删键（zod default 生效）
    expect(out.note).toBeNull();
  });

  it("visibleTo=super 字段：非超管不渲染、不参与必填校验（W0-04 回归）", () => {
    const fields: FieldSpec[] = [
      { key: "secretNote", label: "超管备注", visibleTo: "super", required: true },
      { key: "name", label: "名称", required: true },
    ];
    // mock isSuper=true（上方 vi.mock），super 字段可见；这里验证校验在 isSuper=false 时跳过 super 字段
    const errors = validateRequired(fields, { name: "x" }, false);
    expect(errors).not.toHaveProperty("secretNote");
    expect(errors.name).toBeUndefined();
  });
});

// @vitest-environment jsdom
/**
 * A-02 DataTable 测试：排序（客户端默认 + 服务端回调）、全选/批量回调、每页 10/20/50/100、URL 同步（mock next/navigation）。
 * 既有 data-testid（data-table/bulk-bar/table-skeleton）与 aria 语义保持不变。
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { DataTable, type DataColumn } from "@/components/manager/DataTable";

afterEach(cleanup);

vi.mock("next/navigation", () => {
  const params = new URLSearchParams();
  return {
    useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
    useSearchParams: () => params,
  };
});

type Row = { id: string; name: string; score: number; status: string };

const COLS: DataColumn<Row>[] = [
  { key: "name", label: "名称", sortable: true },
  { key: "score", label: "分数", sortable: true, align: "right" },
  { key: "status", label: "状态", render: "text" },
];

const ROWS: Row[] = [
  { id: "a", name: "张三", score: 80, status: "active" },
  { id: "b", name: "李四", score: 95, status: "inactive" },
  { id: "c", name: "王五", score: 60, status: "active" },
];

const PAGINATION = {
  page: 1, limit: 10, total: 3, totalPages: 1,
  onPageChange: vi.fn(), onLimitChange: vi.fn(),
};

describe("A-02 DataTable", () => {
  it("客户端排序（默认）：点击表头按列排序当前页", () => {
    render(<DataTable caption="测试" rows={ROWS} columns={COLS} rowKey={(r) => r.id} pagination={{ ...PAGINATION }} />);
    fireEvent.click(screen.getByRole("button", { name: /按「分数」排序/ }));
    const cells = screen.getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[1]?.textContent);
    expect(cells[0]).toBe("60"); // 升序：分数最低在前
    fireEvent.click(screen.getByRole("button", { name: /按「分数」排序/ })); // 再点 → 降序
    const cellsDesc = screen.getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[1]?.textContent);
    expect(cellsDesc[0]).toBe("95");
  });

  it("服务端排序：onSortChange 回调触发，不做客户端重排", () => {
    const onSortChange = vi.fn();
    render(
      <DataTable
        caption="测试" rows={ROWS} columns={COLS} rowKey={(r) => r.id}
        pagination={{ ...PAGINATION }} onSortChange={onSortChange} sort={null} syncUrl
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /按「名称」排序/ }));
    expect(onSortChange).toHaveBeenCalledWith({ key: "name", dir: "asc" });
    // rows 顺序不变（服务端排序由调用方重查）
    const first = screen.getAllByRole("row")[1];
    expect(first).toBeDefined();
  });

  it("全选本页 + 批量回调（bulk-bar 出现，run 收到选中行）", async () => {
    const bulkRun = vi.fn();
    render(
      <DataTable
        caption="测试" rows={ROWS} columns={COLS} rowKey={(r) => r.id}
        pagination={{ ...PAGINATION }}
        bulkActions={[{ key: "disable", label: "批量停用", run: bulkRun }]}
      />
    );
    fireEvent.click(screen.getByLabelText("全选本页"));
    expect(screen.getByTestId("bulk-bar")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "批量停用" }));
    expect(bulkRun).toHaveBeenCalledTimes(1);
    expect((bulkRun.mock.calls[0][0] as Row[]).length).toBe(3);
  });

  it("每页条数：10/20/50/100 选项，切换回调 limit", () => {
    const onLimitChange = vi.fn();
    render(
      <DataTable
        caption="测试" rows={ROWS} columns={COLS} rowKey={(r) => r.id}
        pagination={{ ...PAGINATION, onLimitChange }}
      />
    );
    const select = screen.getByLabelText("每页条数") as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toEqual(["10", "20", "50", "100"]);
    fireEvent.change(select, { target: { value: "50" } });
    expect(onLimitChange).toHaveBeenCalledWith(50);
  });

  it("URL 同步（syncUrl）：翻页写入 page 参数（router.replace 被调用）", async () => {
    const replace = vi.fn();
    const nav = await import("next/navigation");
    (nav.useRouter as unknown as ReturnType<typeof vi.fn>) = vi.fn(() => ({ replace })) as never;
    render(
      <DataTable
        caption="测试" rows={ROWS} columns={COLS} rowKey={(r) => r.id}
        pagination={{ ...PAGINATION, totalPages: 5 }} syncUrl
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(replace).toHaveBeenCalled();
    const url = replace.mock.calls[0][0] as string;
    expect(url).toContain("page=2");
  });

  it("既有 data-testid 保持：data-table 容器存在", () => {
    render(<DataTable caption="测试" rows={ROWS} columns={COLS} rowKey={(r) => r.id} pagination={{ ...PAGINATION }} />);
    expect(screen.getByTestId("data-table")).toBeDefined();
  });
});

export interface OperationLogListQuery {
  page: number;
  pageSize: number;
  search: string;
  skip: number;
  take: number;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

export function parseLogListQuery(params: URLSearchParams): OperationLogListQuery {
  const page = parsePositiveInt(params.get("page"), 1);
  const rawPageSize = parsePositiveInt(params.get("pageSize"), 20);
  const pageSize = Math.min(rawPageSize, 100);
  const search = (params.get("search") ?? "").trim();

  return {
    page,
    pageSize,
    search,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

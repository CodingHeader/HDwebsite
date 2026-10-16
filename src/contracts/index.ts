/**
 * 契约出口（禁止绕过本文件从子模块深导入）
 *
 * W0-05 补充：把既有但此前未出口的 `blocks` / `events` 一并纳入 barrel。
 * 二者此前被 `crud-resources/site.ts`、`content-workflow.ts`、`notify-gateway.ts` 等**深导入**，
 * 与本文件首行约定相矛盾；纳入后深导入可逐步收敛（W2-08 的 ESLint 边界规则据此收紧）。
 * 纯加法变更：不修改任何已有导出的名称与语义。
 */
export * from "./common";
export * from "./auth";
export * from "./article";
export * from "./setting";
export * from "./user-action";
export * from "./kinds";
export * from "./blocks";
export * from "./events";
export * from "./resources";
export * from "./kb";
export * from "./chat";
export * from "./content-hub";
export * from "./llm";

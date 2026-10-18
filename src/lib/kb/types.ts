/**
 * C-02（ADR-029 §1.4 扩展）：知识库后端**统一接口**（纯 DTO，无 prisma / 无具体实现）。
 * 目的：把散落的 KbRemoteAdapter（kb-sync）与本地检索（kb-adapter.searchLocal）收敛为**一个注册表**，
 * 供 C-04（Coze 客户端）/ C-05（本地检索）/ C-06（KB API）消费。
 *
 * 设计口径：
 * - 全部方法以 **DTO** 为界（KbDocument / KbHit / KbDocStatus），实现方不得泄漏 prisma 模型；
 * - `search` 与 `pushEntry` 是双轨检索与采集入库的最小面；
 * - `pushDocument` / `removeDocument` / `getDocumentStatus` 面向**文件级**同步（C-04 Coze 文档管线）。
 */
import type { KbHit } from "@/lib/kb-adapter";

/** 后端标识（local = 本地 Knowledge 表兜底；coze = Coze 数据集） */
export type KbBackendName = "local" | "coze";

/** 待推送文档的纯 DTO（由调用方从 Knowledge 行映射，实现方不接触 prisma） */
export type KbDocument = {
  /** 本地条目 id（KnowledgeFile.id 或 Knowledge.id，由 base 决定口径） */
  id: number;
  /** 所属库（本地条目可为 null） */
  baseId?: number | null;
  title: string;
  content: string;
  /** 逗号分隔标签串（沿用 Knowledge.tags 现状） */
  tags?: string | null;
  /** 远端文档 id（覆盖推送时传入） */
  externalId?: string | null;
};

/** 文档同步状态（getDocumentStatus） */
export type KbDocStatus = {
  /** 远端处理状态：0 处理中 / 1 完成 / 9 失败（Coze document_infos[].status 口径） */
  status: 0 | 1 | 9 | null;
  progress: number | null;
  error?: string | null;
};

export type KbSearchOptions = { tags?: string[]; take?: number; baseIds?: number[] };

/** 统一后端接口：local 与 coze 都实现它（能力差异用可选方法表达） */
export type KnowledgeBackend = {
  name: KbBackendName;
  /** 检索（双轨共用返回结构） */
  search: (query: string, opts?: KbSearchOptions) => Promise<KbHit[]>;
  /** 推送/覆盖一条**条目**（对应 Knowledge 行；返回远端 id） */
  pushEntry: (doc: KbDocument) => Promise<{ externalId: string; externalUrl?: string | null }>;
  /** 推送一个**文件**（对应 KnowledgeFile；C-04 Coze 文档） */
  pushDocument?: (doc: KbDocument & { fileUri?: string }) => Promise<{ documentId: string }>;
  /** 删除远端文档/条目 */
  removeDocument?: (externalId: string) => Promise<void>;
  /** 查询远端文档处理状态（进度轮询；C-04/E-11 重建进度用） */
  getDocumentStatus?: (externalId: string) => Promise<KbDocStatus>;
};

/**
 * 角色/用户写入的越权收口（V7-SEC-01）
 *
 * 背景：E1~E5 越权路径（F4）。管理端 role:edit / role:create / user:create / user:edit
 * 允许"非超管"持有，但当前实现只做了 requireAuth 的权限点放行，未校验**写库目标**是否
 * 让调用者获得其本身没有的权限，也未校验是否越过 super-admin 边界，导致可自升超管、可
 * 授予自身没有的权限、可指派超管角色、可重置超管密码、可把最后一名超管改离超管角色。
 *
 * 本模块只做**纯判定**（无 IO、无 prisma），由各路由在写库前调用并返回 403/400；
 * 判定语义与 requireAuth 的 hasPermission 保持一致（isSuper 直通、`*`、`module:*`）。
 * 契约（src/contracts/**）不做改动，只读引用。
 *
 * 错误码约定：权限/边界违规 → 403 FORBIDDEN；会破坏"系统仍存在超管"的不变量 → 400。
 */

export type CallerClaims = {
  isSuper: boolean;
  permissions: readonly string[];
  /** 调用者当前角色 id；自改自身角色时用于识别 */
  callerRoleId?: number | null;
  /** 调用者自身用户 id；用于识别"我把自己改成什么角色" */
  callerUserId?: number | null;
};

/** 角色写入意图（roles POST/PUT） */
export type RoleWriteIntent = {
  /** 目标角色 id（PUT 时为 existing.id；POST 为 undefined） */
  targetRoleId?: number | null;
  /** 请求中期望的 isSuper 值；undefined = 未提交该字段 */
  isSuper?: boolean;
  /** 请求中提交的权限数组；undefined = 未提交该字段（PUT 部分更新） */
  permissions?: readonly string[] | null;
};

/** 用户写入意图（users POST/PUT） */
export type UserWriteIntent = {
  /** 目标用户 id */
  targetUserId: number;
  /** 目标用户当前角色是否超管（变更前的状态） */
  targetRoleIsSuper: boolean;
  /** 请求提交的目标角色 id；null = 未提交 */
  requestedRoleId: number | null;
  /** 请求提交的目标角色是否超管（requestedRoleId 为 null 时忽略） */
  requestedRoleIsSuper: boolean;
  /** 请求中是否提交了 password（重置密码） */
  resetsPassword?: boolean;
};

/**
 * 调用者是否可授予这组权限。
 * 规则：超管直通；`*` 直通；否则每个请求权限都必须被调用者自身权限覆盖
 * （精确包含，或 `module:*` 覆盖 `module:action`）。
 */
export function canGrantPermissions(
  caller: CallerClaims,
  requested: readonly string[],
): boolean {
  if (caller.isSuper) return true;
  const mine = caller.permissions ?? [];
  if (mine.includes("*")) return true;
  return requested.every((p) => grantableBy(mine, p));
}

function grantableBy(mine: readonly string[], permission: string): boolean {
  if (mine.includes(permission)) return true;
  const mod = permission.split(":")[0];
  return mine.includes(`${mod}:*`);
}

/**
 * 校验"创建/更新角色"是否越权。
 * @returns null 表示通过；否则返回 { code: 403|400, message }
 */
export function assertRoleWriteAllowed(
  caller: CallerClaims,
  intent: RoleWriteIntent,
): { code: 403 | 400; message: string } | null {
  const isSuperCaller = caller.isSuper;

  // R1：非超管不得修改自己所属角色（否则可把自身角色的权限/超管位抬升）
  if (!isSuperCaller && caller.callerRoleId != null && intent.targetRoleId != null) {
    if (caller.callerRoleId === intent.targetRoleId) {
      return { code: 403, message: "不能修改自己所属角色" };
    }
  }

  // R2：非超管不得设置 isSuper=true（自升超管/创建超管角色）
  if (intent.isSuper === true && !isSuperCaller) {
    return { code: 403, message: "仅超级管理员可设置超管角色" };
  }

  // R3：非超管不得授予自身没有的权限（权限子集）
  if (intent.permissions && !isSuperCaller) {
    if (!canGrantPermissions(caller, intent.permissions)) {
      return { code: 403, message: "不能授予自身不具备的权限" };
    }
  }

  return null;
}

/**
 * 校验"创建/更新用户"是否越权。
 * 额外需要知道"系统内是否仅剩 1 名超管"（lastSuper）与"目标用户当前是否超管"，
 * 由调用方查询后传入；本函数不触 IO。
 * @param isLastActiveSuperAdmin 若本次变更会把系统超管数降为 0 则为 true
 * @returns null 表示通过；否则 { code: 403|400, message }
 */
export function assertUserWriteAllowed(
  caller: CallerClaims,
  intent: UserWriteIntent,
  opts: { isLastActiveSuperAdmin: boolean },
): { code: 403 | 400; message: string } | null {
  const isSuperCaller = caller.isSuper;

  // U1：非超管不得"指派/改成超管角色"（E3）
  if (intent.requestedRoleId != null && !isSuperCaller && intent.requestedRoleIsSuper) {
    return { code: 403, message: "不能把用户指派为超级管理员角色" };
  }

  // U2：非超管不得重置超管用户密码（E4 前半）
  if (intent.resetsPassword && !isSuperCaller && intent.targetRoleIsSuper) {
    return { code: 403, message: "不能重置超级管理员账号密码" };
  }

  // U3：非超管不得修改超管账号（含角色、状态）
  if (!isSuperCaller && intent.targetRoleIsSuper) {
    return { code: 403, message: "不能修改超级管理员账号" };
  }

  // U4：非超管不得改自己的角色（防自升）
  if (!isSuperCaller && caller.callerUserId != null && caller.callerUserId === intent.targetUserId) {
    if (intent.requestedRoleId != null && intent.requestedRoleId !== caller.callerRoleId) {
      return { code: 403, message: "不能修改自己的角色" };
    }
  }

  // U5：最后一名超管不可被改离超管角色（E5）
  // 关键：只有"当前是超管 && 请求把它改成非超管角色"才拦截；
  // 改密码/昵称/停用（角色未变）应放行，避免超管无法自助维护自身账号。
  if (opts.isLastActiveSuperAdmin && intent.targetRoleIsSuper) {
    if (intent.requestedRoleId != null && !intent.requestedRoleIsSuper) {
      return { code: 400, message: "不能把最后一名超级管理员改离超管角色" };
    }
  }

  return null;
}
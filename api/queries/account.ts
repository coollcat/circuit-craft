import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "./connection";
import { users, sessions, saves } from "@db/schema";

const USERNAME_RE = /^[a-zA-Z0-9_一-龥-]{3,24}$/;

/**
 * 用户不存在时用于「陪跑」的 dummy 盐：让 login 两条路径都执行一次
 * 同等耗时的 scrypt，消除「用户是否存在」的 timing 枚举侧信道。
 */
const DUMMY_SALT = "cc00dummy5a1t0000000000000000000".slice(0, 32);

export function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 32).toString("hex");
}

/* ---------------- 登录限流（内存计数，尽力而为） ---------------- */
// 注意：serverless / 多实例部署下各实例计数互相独立，此处仅作单实例内的
// 轻量限流（挡住脚本直打本实例的穷举），不构成全局限流防线。
const LOGIN_WINDOW_MS = 60_000; // 1 分钟窗口
const LOGIN_MAX_ATTEMPTS = 5; // 同一 username 窗口内最多 5 次尝试
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkLoginRateLimit(username: string): void {
  const now = Date.now();
  const rec = loginAttempts.get(username);
  if (!rec || now >= rec.resetAt) {
    loginAttempts.set(username, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    // 防止 Map 被大量随机用户名撑爆：超上限时顺带清理过期项
    if (loginAttempts.size > 5000) {
      for (const [k, v] of loginAttempts) {
        if (now >= v.resetAt) loginAttempts.delete(k);
      }
    }
    return;
  }
  rec.count += 1;
  if (rec.count > LOGIN_MAX_ATTEMPTS) {
    throw new Error("尝试太频繁，请稍后再试");
  }
}

export async function registerUser(username: string, password: string) {
  if (!USERNAME_RE.test(username)) {
    throw new Error("用户名需为 3-24 位字母/数字/中文/下划线/短横线");
  }
  if (password.length < 8 || password.length > 64) {
    throw new Error("密码需为 8-64 位");
  }
  const db = getDb();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (existing.length > 0) {
    throw new Error("这个用户名已经被占用了，换一组再试");
  }
  const salt = randomBytes(16).toString("hex");
  const passHash = hashPassword(password, salt);
  let inserted;
  try {
    inserted = await db.insert(users).values({ username, passHash, salt });
  } catch (e) {
    // 并发撞名竞态：前置 SELECT 通过后，另一请求抢先插入同名用户，
    // 触发 users.username 唯一约束（MySQL ER_DUP_ENTRY, errno 1062）。
    // 转成与前置检查一致的友好文案，前端按「占用」关键字重试逻辑才能命中。
    const err = e as { errno?: number; message?: string };
    if (err?.errno === 1062 || err?.message?.includes("Duplicate entry")) {
      throw new Error("这个用户名已经被占用了，换一组再试");
    }
    throw e;
  }
  const userId = Number(inserted[0].insertId);
  return { userId, token: await createSession(userId), username };
}

export async function loginUser(username: string, password: string) {
  checkLoginRateLimit(username);
  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  const user = rows[0];
  if (!user) {
    // 用户不存在也执行一次同等 scrypt（dummy 盐），与存在用户路径耗时对齐，
    // 避免响应时间差泄露「用户名是否存在」。
    hashPassword(password, DUMMY_SALT);
    throw new Error("用户名或密码不对");
  }
  const hash = hashPassword(password, user.salt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(user.passHash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("用户名或密码不对");
  }
  loginAttempts.delete(username); // 登录成功清零限流计数
  return { userId: user.id, token: await createSession(user.id), username: user.username };
}

async function createSession(userId: number): Promise<string> {
  const token = randomBytes(24).toString("hex");
  await getDb().insert(sessions).values({ userId, token });
  return token;
}

export async function logoutUser(token: string) {
  await getDb().delete(sessions).where(eq(sessions.token, token));
  return { ok: true };
}

export async function getSessionUser(token: string) {
  const db = getDb();
  const rows = await db
    .select({ userId: sessions.userId, username: users.username })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.token, token))
    .limit(1);
  return rows[0] ?? null;
}

export async function loadSave(token: string) {
  const me = await getSessionUser(token);
  if (!me) throw new Error("登录状态已失效，请重新登录");
  const db = getDb();
  const rows = await db
    .select({ payload: saves.payload, updatedAt: saves.updatedAt })
    .from(saves)
    .where(eq(saves.userId, me.userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function storeSave(token: string, payload: string) {
  const me = await getSessionUser(token);
  if (!me) throw new Error("登录状态已失效，请重新登录");
  if (payload.length > 512 * 1024) throw new Error("存档过大");
  const db = getDb();
  await db
    .insert(saves)
    .values({ userId: me.userId, payload })
    .onDuplicateKeyUpdate({ set: { payload, updatedAt: new Date() } });
  return { ok: true, ts: Date.now() };
}

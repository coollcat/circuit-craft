import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "./connection";
import { users, sessions, saves } from "@db/schema";

const USERNAME_RE = /^[a-zA-Z0-9_一-龥-]{3,24}$/;

export function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 32).toString("hex");
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
  const inserted = await db.insert(users).values({ username, passHash, salt });
  const userId = Number(inserted[0].insertId);
  return { userId, token: await createSession(userId), username };
}

export async function loginUser(username: string, password: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  const user = rows[0];
  if (!user) throw new Error("用户名或密码不对");
  const hash = hashPassword(password, user.salt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(user.passHash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("用户名或密码不对");
  }
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

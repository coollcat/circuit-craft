import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

// 用工厂函数推导实例类型：避免手写 ReturnType<typeof drizzle<...>> 命中不同重载导致的 TS2719
function createDb() {
  const client = mysql.createPool({
    uri: env.databaseUrl,
    waitForConnections: true,
  });
  return {
    db: drizzle(client, { mode: "planetscale", schema: fullSchema }),
    close: () => client.end(),
  };
}

let instance: ReturnType<typeof createDb> | undefined;

export function getDb() {
  instance ??= createDb();
  return instance.db;
}

/** 优雅退出：关闭底层连接池（SIGTERM/SIGINT 时由 boot.ts 调用） */
export async function closeDb(): Promise<void> {
  await instance?.close();
  instance = undefined;
}

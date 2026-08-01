import {
  mysqlTable,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
} from "drizzle-orm/mysql-core";

// 回路工坊账号体系：随机生成的用户名+密码，scrypt 加盐哈希存储
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passHash: varchar("pass_hash", { length: 128 }).notNull(),
  salt: varchar("salt", { length: 64 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 会话令牌：登录/注册时签发，前端 localStorage 持有
export const sessions = mysqlTable("sessions", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 云端存档：每用户一份 JSON 快照（进度/设置/沙盒槽/毕业设计），整存整取
export const saves = mysqlTable("saves", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true })
    .notNull()
    .unique(),
  payload: text("payload").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

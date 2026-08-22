// 数据库种子脚本（占位）：目前无预置数据，保留入口供将来内容组使用。
// 运行方式：npx tsx db/seed.ts（需 DATABASE_URL）
import { closeDb } from "../api/queries/connection";

async function seed() {
  console.log("Seeding database...");
  // TODO: 插入种子数据，例如初始账号演示存档等（届时 import { getDb } from "../api/queries/connection"）
  console.log("Done.");
}

seed()
  .then(() => closeDb())
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    void closeDb().finally(() => process.exit(1));
  });

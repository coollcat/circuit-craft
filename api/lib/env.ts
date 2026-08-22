import "dotenv/config";

// 一律 fail-fast：配置缺失在启动瞬间暴露，而不是拖到第一次 DB 查询才发现。
// （此前开发期静默返回 ""，DATABASE_URL 缺失要等到查询时才报错。）
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}（检查 .env 或启动环境变量）`);
  }
  return value;
}

export const env = {
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
};

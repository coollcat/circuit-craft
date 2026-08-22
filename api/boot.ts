import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { closeDb } from "./queries/connection";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 1024 * 1024 })); // 1MB：与存档上限（512KB）同量级，防滥用
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");

  const port = Number.parseInt(process.env.PORT ?? "3000", 10);
  const listenPort = Number.isFinite(port) ? port : 3000; // PORT=abc 之类的脏值兜底

  serveStaticFiles(app);
  const server = serve({ fetch: app.fetch, port: listenPort }, () => {
    console.log(`Server running on http://localhost:${listenPort}/`);
  });

  // 优雅退出：停接新请求 → 关 MySQL 连接池 → 超时强杀兜底
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => {
      console.log(`\n${signal} received: shutting down...`);
      server.close(() => {
        void closeDb().finally(() => process.exit(0));
      });
      setTimeout(() => process.exit(0), 3000).unref();
    });
  }
}

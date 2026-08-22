import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import {
  registerUser,
  loginUser,
  logoutUser,
  getSessionUser,
  loadSave,
  storeSave,
} from "./queries/account";

const credInput = z.object({
  username: z.string().min(3).max(24),
  password: z.string().min(8).max(64),
});

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),

  account: createRouter({
    register: publicQuery
      .input(credInput)
      .mutation(({ input }) => registerUser(input.username, input.password)),
    login: publicQuery
      .input(credInput)
      .mutation(({ input }) => loginUser(input.username, input.password)),
    logout: publicQuery
      .input(z.object({ token: z.string().min(1) }))
      .mutation(({ input }) => logoutUser(input.token)),
    me: publicQuery
      .input(z.object({ token: z.string().min(1) }))
      .query(({ input }) => getSessionUser(input.token)),
  }),

  save: createRouter({
    load: publicQuery
      .input(z.object({ token: z.string().min(1) }))
      .query(({ input }) => loadSave(input.token)),
    store: publicQuery
      .input(z.object({ token: z.string().min(1), payload: z.string() }))
      .mutation(({ input }) => storeSave(input.token, input.payload)),
  }),
});

export type AppRouter = typeof appRouter;

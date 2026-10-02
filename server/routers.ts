import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  localSync: router({
    overview: publicProcedure.query(() => ({
      status: "healthy" as const,
      storesConnected: 620,
      cities: 3,
      model: "transparent deterministic prototype intelligence",
      signals: ["inventory freshness", "stock cover", "store reliability", "delivery capacity"],
    })),
    adminOverview: adminProcedure.query(({ ctx }) => ({
      role: ctx.user.role,
      canViewBusinessHealth: true,
      canViewDeliveryOperations: true,
      canViewRetentionAndPromotions: true,
    })),
    auditLogs: adminProcedure.query(() => db.listAuditLogs(75)),
  }),

  admin: router({
    updateUserRole: adminProcedure
      .input((value: unknown) => {
        if (!value || typeof value !== "object" || typeof (value as { userId?: unknown }).userId !== "number" || !["user", "admin"].includes((value as { role?: unknown }).role as string)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "userId and role are required" });
        }
        return value as { userId: number; role: "user" | "admin" };
      })
      .mutation(async ({ ctx, input }) => {
        if (input.userId === ctx.user.id && input.role !== "admin") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot remove your own admin access" });
        }
        const target = await db.getUserById(input.userId);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        const updated = await db.updateUserRole(input.userId, input.role);
        await db.recordAuditLog({
          actorId: ctx.user.id,
          action: "PERMISSION_CHANGED",
          entityType: "USER",
          entityId: String(input.userId),
          metadata: { targetEmail: target.email, previousRole: target.role, nextRole: input.role },
        });
        return { user: updated, recorded: true };
      }),
    recordAction: adminProcedure
      .input((value: unknown) => {
        if (!value || typeof value !== "object") throw new TRPCError({ code: "BAD_REQUEST", message: "Audit payload is required" });
        const payload = value as Record<string, unknown>;
        if (typeof payload.action !== "string" || typeof payload.entityType !== "string" || typeof payload.entityId !== "string") throw new TRPCError({ code: "BAD_REQUEST", message: "action, entityType, and entityId are required" });
        return { action: payload.action, entityType: payload.entityType, entityId: payload.entityId, metadata: typeof payload.metadata === "object" && payload.metadata !== null ? payload.metadata as Record<string, unknown> : undefined };
      })
      .mutation(async ({ ctx, input }) => {
        await db.recordAuditLog({ actorId: ctx.user.id, ...input });
        return { recorded: true } as const;
      }),
  }),
});

export type AppRouter = typeof appRouter;

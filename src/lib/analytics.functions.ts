import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

type AdminSession = { admin?: boolean };

function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "kazza-admin",
    maxAge: 60 * 60 * 24 * 7,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

async function isAdmin() {
  const session = await useSession<AdminSession>(sessionConfig());
  return !!session.data.admin;
}

const s = (max: number) => z.string().max(max).nullish();

const eventInput = z.object({
  visitorId: z.string().min(4).max(64),
  event: z.enum(["page_view", "product_view", "add_to_cart", "checkout", "purchase"]),
  path: s(300),
  productId: s(120),
  productName: s(200),
  value: z.number().min(0).max(1_000_000).nullish(),
  items: z
    .array(z.object({ name: z.string().max(200), quantity: z.number().int().min(1).max(99) }))
    .max(40)
    .nullish(),
  utm_source: s(120),
  utm_medium: s(120),
  utm_campaign: s(200),
  utm_content: s(200),
  utm_term: s(200),
  referrer: s(300),
  device: s(20),
});

export type TrackInput = z.infer<typeof eventInput>;

export const trackEvent = createServerFn({ method: "POST" })
  .inputValidator((d) => eventInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("funnel_events").insert({
      visitor_id: data.visitorId,
      event: data.event,
      path: data.path ?? null,
      product_id: data.productId ?? null,
      product_name: data.productName ?? null,
      value: data.value ?? null,
      items: data.items ?? null,
      utm_source: data.utm_source ?? null,
      utm_medium: data.utm_medium ?? null,
      utm_campaign: data.utm_campaign ?? null,
      utm_content: data.utm_content ?? null,
      utm_term: data.utm_term ?? null,
      referrer: data.referrer ?? null,
      device: data.device ?? null,
    });
    return { ok: true };
  });

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => ({ password: String(d.password ?? "") }))
  .handler(async ({ data }) => {
    const expected = process.env["ADMIN_PASSWORD"] ?? "";
    const a = createHash("sha256").update(data.password).digest();
    const b = createHash("sha256").update(expected).digest();
    if (!expected || !timingSafeEqual(a, b)) return { ok: false };
    const session = await useSession<AdminSession>(sessionConfig());
    await session.update({ admin: true });
    return { ok: true };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  await session.clear();
  return { ok: true };
});

export const adminStatus = createServerFn({ method: "GET" }).handler(async () => ({
  admin: await isAdmin(),
}));

export const getLiveData = createServerFn({ method: "POST" })
  .inputValidator((d: { hours: number }) => ({
    hours: Math.min(720, Math.max(1, Number(d.hours) || 24)),
  }))
  .handler(async ({ data }) => {
    if (!(await isAdmin())) return { ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - data.hours * 3600_000).toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("funnel_events")
      .select(
        "id, visitor_id, event, path, product_name, value, items, utm_source, utm_medium, utm_campaign, utm_content, referrer, device, created_at",
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(3000);
    if (error) return { ok: false as const };
    return { ok: true as const, rows: rows ?? [], now: new Date().toISOString() };
  });

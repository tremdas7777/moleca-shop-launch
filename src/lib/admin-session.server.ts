/** Verificação da sessão do painel (somente servidor). Mesma config de analytics.functions.ts. */
import { useSession } from "@tanstack/react-start/server";

type AdminSession = { admin?: boolean };

export async function isAdmin() {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- useSession é do TanStack Start, não um hook React.
  const session = await useSession<AdminSession>({
    password: process.env["SESSION_SECRET"]!,
    name: "kazza-admin",
    maxAge: 60 * 60 * 24 * 7,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  });
  return !!session.data.admin;
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { CartSheet } from "../components/store/CartSheet";
import { Newsletter } from "../components/store/Newsletter";
import { SiteFooter } from "../components/store/SiteFooter";
import { SiteHeader } from "../components/store/SiteHeader";
import { Toaster } from "../components/ui/sonner";
import { CartProvider } from "../lib/cart";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { store } from "../lib/store";
import { track } from "../lib/track";
import { getTrackingPixels } from "../lib/pixels.functions";
import { META_PIXEL_ID, UTMIFY_PIXEL_ID } from "../lib/tracking-config";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi removida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar para a loja
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

/** Snippet do Meta Pixel com todos os Pixels ativos cadastrados no painel. */
function metaPixelSnippet(ids: string[]) {
  const inits = ids.map((id) => `fbq('init', '${id.replace(/\D/g, "")}');`).join("");
  return `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');${inits}fbq('track', 'PageView');`;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: async () => {
    try {
      return { metaPixels: (await getTrackingPixels()).meta };
    } catch {
      return { metaPixels: [META_PIXEL_ID] };
    }
  },
  staleTime: Infinity,
  head: ({ loaderData }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${store.name} ${store.tagline} | Produtos para Estética Automotiva` },
      { name: "description", content: store.description },
      { name: "author", content: store.name },
      { property: "og:title", content: `${store.name} ${store.tagline}` },
      { property: "og:description", content: store.description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [
      // Meta Pixel (todos os Pixels ativos do painel)
      ...(loaderData?.metaPixels.length
        ? [{ type: "text/javascript", children: metaPixelSnippet(loaderData.metaPixels) }]
        : []),
      // Utmfy Pixel
      {
        type: "text/javascript",
        children: `window.pixelId = "${UTMIFY_PIXEL_ID}";(function(){var s=document.createElement("script");s.src="https://cdn.utmify.com.br/scripts/pixel/pixel.js";s.async=true;s.defer=true;document.head.appendChild(s);})();`,
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/admin");
  // Admin e checkout têm layout próprio, sem cabeçalho/rodapé da loja.
  const bare = isAdmin || pathname.startsWith("/checkout");

  const firstView = useRef(true);
  useEffect(() => {
    track({ event: "page_view", path: pathname });
    // O snippet do Pixel já conta a primeira página; as navegações seguintes são client-side.
    if (firstView.current) firstView.current = false;
    else if (!isAdmin) window.fbq?.("track", "PageView");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        {!bare && <SiteHeader />}
        <main className="bg-white">
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </main>
        {!bare && <Newsletter />}
        {!bare && <SiteFooter />}
        {!bare && <CartSheet />}
        <Toaster position="top-center" />
      </CartProvider>
    </QueryClientProvider>
  );
}

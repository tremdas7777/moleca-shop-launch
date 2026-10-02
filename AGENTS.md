<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- PixGate (PIX) credentials/logic live in *.server.ts (pixgate.server.ts, orders.server.ts), loaded via dynamic import inside server-fn handlers — keeps the API key (secret PIXGATE_API_KEY) out of client bundles. Never hardcode keys: this repo is public.

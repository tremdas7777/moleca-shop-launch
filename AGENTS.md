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
- Zedy credentials/logic live in *.server.ts (zedy-client.server.ts, zedy-checkout.server.ts), loaded via dynamic import inside server-fn handlers — keeps the token out of client bundles; a server-only fallback token lets remixed copies in other workspaces check out without re-adding secrets.

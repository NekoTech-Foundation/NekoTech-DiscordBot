# Jikan Addon (Anime/Manga)

This addon integrates the public Jikan API (MyAnimeList v4) to bring anime/manga info into your Discord server.

Commands

- `/anime search q:<text> [page]`: Search anime by text
- `/anime top [type] [page]`: View top anime (all, tv, movie, ova)
- `/anime season [year] [season] [page]`: Seasonal anime (or current if omitted)
- `/anime random`: Random anime
- `/anime character q:<text> [page]`: Search characters
- `/anime schedule [day] [page]`: Airing schedule by day

Implementation notes

- API: https://api.jikan.moe/v4
- Basic retry on HTTP 429 (one backoff retry)
- Embeds built via `addons/Jikan/ui.js` with concise, readable fields
- No database required; purely live API reads

Roadmap

Phase 1 — Core (this PR)
- Search/top/season/random/character/schedule commands
- Simple list pagination via page option
- Basic rate-limit backoff
- Clean, consistent embeds

Phase 2 — UX Polish
- Button-based pagination (next/prev) on search/top/season/schedule
- Richer embeds (genres, studios, trailer link, producers)
- Language toggle and NSFW filtering options in a small config
- Error surface with helpful guidance (e.g., try different `type` or `page`)

Phase 3 — Content Expansion
- Manga parity commands (search/top/random/seasonal if available)
- Recommendations: `/anime rec id:<mal_id>` or by title resolves id then fetches recommendations
- Related content: prequel/sequel/spinoff links
- Character’s animeography listing

Phase 4 — Caching and Performance
- In-memory LRU cache for hot endpoints
- Smarter retry/backoff with jitter; handling API downtime messages
- Optional database cache for guilds with heavy usage

Phase 5 — Power features
- Watchlist: per-user saved entries (requires DB)
- Alerts: daily schedule digest to a channel; episode air pings
- Inline trailers (YouTube) where provided by Jikan

Operational considerations
- Respect Jikan rate limits (avoid aggressive refresh)
- Handle missing data gracefully; Jikan fields vary per entry
- Validate query strings; clamp page values

Feel free to request additional features or tweaks to match your community needs.


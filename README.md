# TurfAI Local Brain

Separate local prediction sandbox. No production deployment configuration,
OpenRouter prediction provider, credentials, or saved race data is included.

## Run

Use Node.js 22 or newer. Run `npm ci`, copy `.env.example` to `.env.local`,
then run `npm run dev`. Open http://127.0.0.1:3030/.

The default is deterministic LocalBrain. Set `FIRESTORE_ENABLED=true` and
configure a read-only Firebase identity to read collected cards/results.
Public REST reads are used only if no explicit credential is configured and
Firestore rules permit those reads. Nothing here changes live Firebase rules.
Missing race data can be fetched using optional Racing API credentials.

Set `USE_LOCAL_GEMINI_HYBRID=true` and provide `GEMINI_API_KEY` to combine
LocalBrain ranking with Gemini runner evidence. Gemini failures fall back to
LocalBrain. There are no OpenRouter/full-AI prediction calls.

Predictions and cache are saved to `.turfai-db.json` in this folder, which is
ignored by Git. Current-day local predictions are kept separate from stored
production AI predictions; historical pages display archived data where available.

## Isolation

- Firestore writes are blocked both at the cache queue and SDK boundary.
- Production cron/admin/debug mutation routes and schedulers are removed.
- Local prediction requests save only to the local JSON database.
- Server defaults to loopback. Do not expose it publicly or override the host.
- Analytics collection is disabled; local tests do not add live GA traffic.
- Never reuse a production writer service account. Use a dedicated read-only
  identity and keep credential files outside the repository.

Run `npm test` for isolation tests and `npm run build` for a build check.

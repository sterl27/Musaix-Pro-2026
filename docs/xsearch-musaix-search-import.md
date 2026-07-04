# XSearch / Musaix Search Import

Imported from uploaded archive `xsearch-main.zip`.

## Local build result

```txt
npm install --no-audit --no-fund
npm run build
# Result: successful Vite production build
```

## Archive

The full uploaded source archive is stored as base64 at:

```txt
archives/xsearch-main-2026-07-04.zip.b64
```

Restore it with:

```bash
base64 -d archives/xsearch-main-2026-07-04.zip.b64 > xsearch-main.zip
unzip xsearch-main.zip
cd xsearch-main
npm install
npm run build
```

## App identity

- Root app: `musaix-search`
- Framework: Vite + React 18 + TypeScript
- Backend assumptions: Supabase Auth/DB/Edge Functions
- Nested app: `musaix-pro`, Vite + React 19

## Deploy boundary

Do not overwrite the current Musaix Pro 2026 root until the Vercel project mapping is confirmed. Use this archive as the clean import source, then promote into a dedicated repo/project or a branch once the target is locked.

## Recommended Vercel targets

```txt
GitHub: sterl27/Musaix-Pro-2026
Vercel: musaix-pro or a new musaix-search project
```

## SHA256

```txt
28d28c3570010dc44e7ac94dcfbba8c499a60dd7ed2be8e1865cfb56cb91661b
```

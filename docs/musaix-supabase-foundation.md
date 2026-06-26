# Musaix Pro v2 Supabase Foundation

Project: `xexzplnyzblflucfvbwt`  
URL: `https://xexzplnyzblflucfvbwt.supabase.co`

## Purpose

This foundation makes Supabase the system of record for the Musaix Intel Report workflow:

```txt
Upload audio
→ Store in private Supabase bucket
→ Create musaix_tracks row
→ Run Librosa / MIR analysis
→ Store musaix_audio_reports JSON
→ Store sections + hook candidates
→ Save memory items
→ Export reports
```

## Tables Added

- `musaix_tracks`
- `musaix_audio_reports`
- `musaix_report_sections`
- `musaix_hook_candidates`
- `musaix_memory_items`
- `musaix_report_exports`

## Storage Buckets Added

- `musaix-audio`
- `musaix-waveforms`
- `musaix-reports`
- `musaix-covers`

All buckets are private by default.

## RLS

All new tables have owner-only RLS policies using:

```sql
auth.uid() = user_id
```

Backend workers should use the service role key only on trusted server-side routes.

## UI Mapping

| UI Area | Supabase Source |
|---|---|
| Upload Card | `musaix-audio` + `musaix_tracks` |
| Intel Report | `musaix_audio_reports` |
| Sonic Architecture | `musaix_report_sections` |
| Hook Candidates | `musaix_hook_candidates` |
| Artist Memory Vault | `musaix_memory_items` |
| PDF / JSON Export | `musaix_report_exports` + `musaix-reports` |

## Next App Environment

```env
NEXT_PUBLIC_SUPABASE_URL=https://xexzplnyzblflucfvbwt.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

## Minimal, high‑impact security plan (optimized for a solo dev)

### Goals
- **Protect user data** with strict RLS and default‑deny
- **Preserve current app behavior** (no breaking core features)
- **Keep implementation small**: essential policies only; light client hardening

### What we will actually do
1) Enable RLS (default‑deny) on all app tables
2) Apply essential per‑table policies (below) to match current code
3) Lock down client logging to avoid leaking tokens/keys
4) Add minimal storage rules for photos
5) Smoke‑test critical flows (lists/items/posts/likes/comments/profiles)

### Per‑table RLS (practical set)
- Achievements: SELECT all; no client INSERT/UPDATE/DELETE
- AI/App/Feed telemetry (`ai_performance_metrics`, `app_errors`, `error_events`, `feed_performance_metrics`, `app_versions`): INSERT allowed from client; no SELECT from client
- Follows: SELECT for authenticated users; INSERT/DELETE by follower only; no UPDATE
- Lists: owner‑only CRUD; also SELECT allowed if referenced by a public post (for joins)
- Items: owner‑only CRUD via owning list; public READ if referenced by a public post or `items.is_public = true`
- Posts: READ if `is_public = true` or owner; owner‑only INSERT/UPDATE/DELETE (and must reference own list/item)
- Likes/Comments: READ if post is public or owner/author; INSERT/DELETE by row owner only
- Notifications: owner‑only READ/UPDATE; no client INSERT
- Profiles: public READ when `is_private = false`, owner READ/WRITE otherwise
- Profile stats: owner READ; server maintains rows (no client writes)
- Users (public mirror): owner READ/WRITE (no cross‑user access)

Note: Admin/service flows use the Supabase service role and bypass RLS; no extra policy needed.

### Storage (photos bucket)
- Public read only for assets tied to public posts; owner‑only read/write for private
- Prefer signed URLs for any non‑public items

### Client hardening (must‑do only)
- Remove key previews and values from logs; never print Authorization, apikey, or tokens
- Keep `service_role` strictly server‑side (Edge Functions, CI)
- Use minimal column selects and keep `is_public` filters in place

### Rollout (fast track)
- Step 1: Apply `sql/rls_policies.sql` in staging; verify with the app
- Step 2: Sanity tests: create list/item/post, like/comment, view public profiles/posts
- Step 3: Deploy to production; rotate anon key if previously leaked; re‑test

### Deliverables
- `sql/rls_policies.sql` with all policies
- Small client changes to sanitize logs (already applied)
- Short checklist of manual tests (above)


### Adversarial review (holes and fixes)
- Username login privacy
  - Risk: current RPC returns email for public profiles (email exposure)
  - Fix: implement an Edge Function `username-login` that accepts `{ username, password }`, resolves email server-side with service role, calls Supabase Auth to create a session, and returns `{ access_token, refresh_token }` only. Do not return email. Then:
    - Update client `signInWithIdentifier` to call `username-login` and set session; remove RPC usage
    - Remove `resolve_email_by_username` function from SQL once migrated

- Social graph enumeration (optional tightening)
  - Current: follows readable when either side is public or viewer is involved
  - Option: restrict reads to viewer-involved only on non-profile pages; expose only counts on public profile via a server function

- Public column surface on `items`/`lists`
  - Risk: public posts allow reading all columns of referenced rows
  - Fix: create views exposing only safe columns (e.g., `public_post_items_view`, `public_post_lists_view`) and switch feed/profile queries to those views; keep base tables private

- Storage (photos) RLS
  - Add bucket policies: owner-only read/write by default; public read only if linked to a `posts.is_public = true`; use signed URLs for private assets

- Achievement integrity
  - Move awarding to an Edge Function (service role) or add DB triggers/constraints to prevent self-award abuse

- Email exposure in likes
  - Fixed: removed `users:user_id(email)` from likes query; keep using `profiles` only



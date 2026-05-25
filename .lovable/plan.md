## Problem

When you tap **Approve** on a Telegram inline button, the backend already does the right thing — `telegram-webhook` calls `agent-action-execute`, which updates the `approvals` row to `approved` and runs the action. The issue is purely on the web: the Approvals page (and the action cards inside Rooms) only load approvals once on mount. They never re-fetch, so the Telegram-side decision is invisible until you manually refresh.

## Fix

Make the web subscribe to approval changes in realtime so a Telegram tap instantly flips the card from Pending → Resolved on screen.

### 1. Enable realtime on `approvals` (migration)

```sql
ALTER TABLE public.approvals REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.approvals;
```

### 2. `src/pages/Approvals.tsx`

- After the initial `loadApprovals()`, subscribe to a Postgres-changes channel on `public.approvals` filtered to the current `user_id`.
- On any `INSERT` / `UPDATE` / `DELETE`, call `loadApprovals()` (cheap, keeps logic simple and avoids reconciling partial rows).
- Clean up the channel on unmount / user change.

### 3. `src/jwba/rooms/RoomOverlay.tsx`

The room renders an inline Approve/Reject card for each `[ACTION:…]` block. Add the same realtime subscription scoped to the current `room_id` (the approval rows created from a room carry `payload_json.room_id`, but we can just subscribe to all of the user's approvals and let the renderer pick up status changes). When an approval's status changes, swap the buttons for a small "✅ Approved via Telegram" / "❌ Rejected" pill so the user sees parity.

### 4. Telegram confirmation message (small UX polish)

After a successful approve in `telegram-webhook` (line ~95), also send a follow-up `tgSend` with `"✅ Action executed — also marked approved in the Approval Gate."` so the user knows the web reflects it. Already partially done by `agent-action-execute`'s Telegram notify, so just verify both don't double-post (skip the extra send if the executor will notify).

## Out of scope

- No new tables, no new edge functions, no schema changes besides enabling realtime on `approvals`.
- Doesn't touch the executor logic — that's already correct.
- Doesn't add per-room filtering on the realtime channel; one user-scoped channel is enough.

## Files touched

- new migration: enable realtime on `approvals`
- `src/pages/Approvals.tsx` — realtime subscription
- `src/jwba/rooms/RoomOverlay.tsx` — realtime subscription + resolved-state rendering
- `supabase/functions/telegram-webhook/index.ts` — minor dedupe of the success message

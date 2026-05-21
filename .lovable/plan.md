
# Conversational Telegram for JW Brand Agents

Bring the web Rooms experience to Telegram: persistent memory, any-agent addressing, and a bridge that saves Telegram threads into JWBA daily pages.

## 1. Rolling conversation memory

Replace the stateless one-shot in `telegram-webhook` with a context-aware turn.

- On each non-command message, load the last N (default 12) rows from `telegram_messages` for that `chat_id` ordered by `created_at`.
- Build an OpenAI-style `messages[]`: inbound → `user`, outbound → `assistant`. Prepend the active agent's system prompt.
- Keep total context under ~4k tokens (truncate oldest turns first).
- Add a `/reset` command that inserts a synthetic "memory cleared" marker so subsequent loads start fresh.

## 2. Multi-agent addressing

Let any JW Brand agent (Athena, Cipher, Nova, Optimus, etc.) respond from Telegram.

- **Active agent state**: reuse `jwba_agent_state.active_agent` (already keyed by `user_id` and supports `telegram_chat_id`). Default to `optimus` when unset.
- **Addressing rules** parsed in order:
  1. `@codename ...` mention at start → route that turn to that agent (does not change active agent).
  2. `/agent <codename>` → set active agent persistently, ack with the new persona.
  3. `/agents` → list available codenames + short descriptions from `jwba_agents`.
  4. Otherwise → route to current active agent.
- Each agent's reply prefixes the persona name: e.g. `*Athena*\n…` so the chat reads like a multi-character thread.
- System prompt is built from `jwba_agents.spec` (role, tone, expertise) so each persona feels distinct.

## 3. Bridge Telegram threads into JWBA Rooms

Make Telegram a first-class Room surface so saved conversations land in today's daily page.

- On first inbound message of a calendar day (per `chat_id`), open a new `jwba_rooms` row (`title: "Telegram – <date>"`, `status: open`) and add the active agent as a member.
- Mirror each inbound/outbound Telegram message into `jwba_room_messages` (`sender_kind: user|agent`, `agent_codename`).
- When the user sends `/save`, invoke the existing `jwba-room-save` function targeting today's daily page → produces the same summarized block as the web Room "end & save" flow.
- `/endroom` closes the current day's room without saving (rare).
- Web Rooms overlay automatically picks the open Telegram room up because `RoomContext` already restores the most recent open room for the user.

## 4. New commands summary

| Command | Effect |
|---|---|
| `/agents` | List all agents with codenames |
| `/agent <codename>` | Set active agent for this chat |
| `@codename …` | One-off message to that agent |
| `/reset` | Clear conversation memory |
| `/save` | Save current thread into today's daily page |
| `/endroom` | Close the bridged room without saving |

## Technical notes

**Edge function changes (`supabase/functions/telegram-webhook/index.ts`):**
- Add `loadHistory(chat_id, limit)` helper that maps `telegram_messages` rows to chat-completion `messages[]`.
- Add `resolveAgent(text, userId, chat_id)` returning `{agent, cleanedText, persistChange}` based on `@mention` / `/agent` / `jwba_agent_state`.
- Add `getOrOpenTelegramRoom(userId, chat_id)` returning a `room_id`, opening one if today's room doesn't exist.
- After AI call: insert into `jwba_room_messages` (user + assistant) in addition to existing `telegram_messages` log.
- Build system prompt from `jwba_agents.spec` for the resolved agent; fall back to existing generic Optimus prompt if spec missing.

**DB:** no schema changes required — all needed tables (`jwba_agents`, `jwba_agent_state`, `jwba_rooms`, `jwba_room_messages`, `jwba_room_members`, `telegram_messages`) already exist. `jwba_agent_state.telegram_chat_id` already accommodates the per-chat active agent.

**No frontend changes** required; the web Room overlay will start showing the active Telegram thread automatically.

## Out of scope
- Group chat support (only 1:1 Telegram for now).
- Image/voice ingestion (text only).
- Cross-chat agent handoff inside a single Telegram message.

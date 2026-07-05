## Problem

Approve/Reject buttons in Telegram do nothing. The webhook handler already supports `callback_query` (see `supabase/functions/telegram-webhook/index.ts` lines 51, 131–132), but the webhook is registered with `allowed_updates: ["message"]` only, so Telegram never delivers button-tap events.

## Fix

Re-register the Telegram webhook via the connector gateway to include `callback_query` in `allowed_updates`. No code changes needed.

Call `POST https://connector-gateway.lovable.dev/telegram/setWebhook` with the existing webhook URL and:

```json
{
  "url": "<current telegram-webhook function URL>",
  "secret_token": "<derived from TELEGRAM_API_KEY, unchanged>",
  "allowed_updates": ["message", "edited_message", "callback_query"]
}
```

Then verify with `getWebhookInfo` that `allowed_updates` now includes `callback_query` and `last_error_message` is empty.

## Verification

1. Confirm `getWebhookInfo` shows `allowed_updates: ["message","edited_message","callback_query"]`.
2. Ask you to tap Approve on a pending Telegram approval; then check the `approvals` row moved to `approved` and `agent_action-execute` ran (via `agent_runs`).

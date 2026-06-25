## Plan

Check the current Telegram webhook status without changing anything.

1. Call `getWebhookInfo` through the Lovable connector gateway from the sandbox using `LOVABLE_API_KEY` + `TELEGRAM_API_KEY`.
2. Report back:
   - Registered webhook URL (and whether it points at this project's `telegram-webhook` function)
   - Pending update count
   - Last error message + timestamp (if any)
   - Allowed update types
3. If anything looks wrong (empty URL, wrong URL, recent errors), recommend a follow-up — but make no changes in this step.

No code, config, or secret changes.

# JIC Messages: HIPAA readiness checklist

Not legal advice. A HIPAA attorney or compliance officer must confirm what applies. No app is "HIPAA compliant" on its own: compliance covers the organization, its vendors and its paperwork.

## Done in the app (branch feat/privacy-hardening)
- Phone unlock (fingerprint, face or PIN) is required every time the app opens; it cannot be turned off, and the app refuses to run on a phone with no screen lock.
- Locks again after the chosen time in the background (right away, 1, 2 or 5 minutes; default 2).
- Android screenshots and screen recording are blocked, and the recent-apps preview is blank (FLAG_SECURE via plugins/withSecureScreen.js). On both platforms a blank cover is drawn whenever the app is not in the foreground. iPhone screenshots cannot be blocked without extra native code.
- Sign-out clears tokens, the scheduled unread reminder and notifications waiting in the tray. The app never writes message content to disk.
- A warning appears before a message is sent by text, email or call.
- Local reminders say only "You have unread messages."

## Done on the server (branch privacy/generic-push-text in jic-agents-v3)
- Every push says "You have a new message." with the message id only. The "sender" and "full" preview modes no longer change the text.

## Still needed (not in code)
- Signed business associate agreements (BAAs) with: hosting, database, text/SMS and email providers, call/voice providers, AI/transcription vendors, and error or log tooling, if any of them can see message content. Check which plan tier a vendor requires for a BAA.
- Server session limit: refresh tokens should expire after a set period of inactivity, and be revocable per device. The app can only sign out locally.
- Encryption at rest and in transit for the database, recordings, transcripts and backups; per-user logins with multi-factor sign-in on the portal; an audit log of who viewed or sent which message.
- Retention and deletion rules for messages, recordings and transcripts (the portal has retention settings; confirm they match policy).
- Keep message text, caller names and numbers out of server logs, error reports and analytics.
- Redirecting by text, email or call sends content over channels that are not secure. Decide whether to disable those methods for PHI and keep only "app notification".
- Written risk analysis, security policies, staff training, an incident and breach-response plan, and a way to wipe or revoke a lost phone.

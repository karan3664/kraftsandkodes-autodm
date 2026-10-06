# Webhook setup

Callback URL:

```
https://app.kraftsandkodes.com/api/webhooks/instagram
```

Local testing requires a public HTTPS tunnel to:

```
https://YOUR_TUNNEL/api/webhooks/instagram
```

## Meta App Dashboard

1. Instagram product → **Webhooks**
2. Callback URL: the HTTPS URL above
3. Verify token: the same value as `META_WEBHOOK_VERIFY_TOKEN`
4. Subscribe the app to the **comments** field
5. After a user connects Instagram, AutoDM also calls `POST /me/subscribed_apps?subscribed_fields=comments`

If the per-account subscribe call fails, the dashboard shows **Not connected** plus the error. It does not fake success.

## Verification (GET)

Meta sends:

```
GET /api/webhooks/instagram
  ?hub.mode=subscribe
  &hub.verify_token=TOKEN
  &hub.challenge=CHALLENGE
```

The app returns the challenge as plain text when the token matches.

## Notifications (POST)

The app:

1. Verifies `X-Hub-Signature-256` using `META_APP_SECRET` (skipped only in mock mode)
2. Acknowledges quickly with HTTP 200
3. Deduplicates on `WebhookEvent.eventId`
4. Finds the connected `InstagramAccount`
5. Matches enabled automations
6. Sends at most one private reply per comment
7. Writes `AutomationExecution`

## Signature

```
X-Hub-Signature-256: sha256={HMAC_SHA256(raw_body, META_APP_SECRET)}
```

## Razorpay webhook

Callback URL:

```
https://app.kraftsandkodes.com/api/webhooks/razorpay
```

Header: `X-Razorpay-Signature` = HMAC-SHA256(raw body, `RAZORPAY_WEBHOOK_SECRET`).

Handled events: `payment.captured`, `order.paid`, `payment.failed`.

## Live requirements

- Advanced Access for comment webhooks on tech-provider apps
- The media owner’s Instagram professional account must be public for comment notifications
- Only one private reply per commenter; must be sent within 7 days of the comment (live comments only during the broadcast)

## Private reply endpoint

Configured in `packages/instagram` (do not scatter Graph URLs):

```
POST {META_GRAPH_BASE_URL}/{META_API_VERSION}/{IG_USER_ID}/messages
```

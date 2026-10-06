# Meta App Review

Product: **KRAFTSANDKODES AutoDM** by **Karan Digital Labs**

AutoDM is an Instagram-first SaaS for creators and businesses. A user connects a professional Instagram account, creates a keyword automation, and AutoDM sends **one eligible private reply** when someone comments that keyword on the user’s post or reel.

This is not a dating or matrimonial product. It does not send unsolicited bulk DMs.

## Permissions requested

- `instagram_business_basic` — identify the professional account
- `instagram_business_manage_comments` — receive comment webhooks and send a private reply to a commenter
- `instagram_business_manage_messages` — deliver that reply as an Instagram private message

## Real product flow

1. Reviewer opens `https://app.kraftsandkodes.com`
2. Signs up / logs in
3. Dashboard → Instagram → **Connect Instagram**
4. Completes Instagram Login and grants the permissions above
5. The professional account appears as Connected (username + account ID)
6. Dashboard → Automations → Create automation for a specific reel or post
   - Select the reel
   - Keywords: TRAIN, TRAIN LINK, LINK
   - Action: Send Private Reply
7. On Instagram, comment `TRAIN` on a post or reel owned by the connected professional account
8. Meta sends a `comments` webhook to `/api/webhooks/instagram`
9. AutoDM matches the enabled automation and sends one private reply
10. Dashboard → Activity shows the comment, keyword, automation, and send status

## Official Meta sources checked

These are the documents the implementation follows. They were checked on 4 October 2026.

- [Business Login for Instagram](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login), updated 13 March 2026
- [Private replies](https://developers.facebook.com/docs/instagram-platform/private-replies)
- [Webhook examples](https://developers.facebook.com/docs/instagram-platform/webhooks/examples), updated 24 November 2025

### Endpoints

| Step              | Method and URL                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| Authorize         | `GET https://www.instagram.com/oauth/authorize`                                                                 |
| Short-lived token | `POST https://api.instagram.com/oauth/access_token`                                                             |
| Long-lived token  | `GET {META_GRAPH_BASE_URL}/access_token?grant_type=ig_exchange_token`                                           |
| Refresh           | `GET {META_GRAPH_BASE_URL}/refresh_access_token?grant_type=ig_refresh_token`                                    |
| Profile           | `GET {META_GRAPH_BASE_URL}/{META_API_VERSION}/me?fields=user_id,username,name,profile_picture_url,account_type` |
| Media             | `GET {META_GRAPH_BASE_URL}/{META_API_VERSION}/{IG_USER_ID}/media`                                               |
| Subscribe         | `POST {META_GRAPH_BASE_URL}/{META_API_VERSION}/me/subscribed_apps?subscribed_fields=comments`                   |
| Private reply     | `POST {META_GRAPH_BASE_URL}/{META_API_VERSION}/{IG_USER_ID}/messages`                                           |

Authorization codes have a `#_` suffix that is not part of the code. The short-lived token response is `{ data: [{ access_token, user_id, permissions }] }`. Long-lived tokens last 60 days and can be refreshed after 24 hours while `instagram_business_basic` remains granted.

### Private reply payload

```json
{
  "recipient": { "comment_id": "<COMMENT_ID>" },
  "message": { "text": "<TEXT>" }
}
```

Required permissions for this call are `instagram_business_basic` and `instagram_business_manage_comments`. AutoDM also requests `instagram_business_manage_messages` because the reply is delivered as an Instagram message. Meta allows one private reply per comment, within 7 days (during the broadcast only for Live). The app does not request content publishing, insights, or Human Agent.

Comment webhooks are accepted both as `entry.changes[]` and as `entry.field` / `entry.value`. The media id is `value.media.id`. A comment is matched only to automations for that media.

### Real-mode limits

OAuth, webhook verification, and the private-reply request are implemented against the documents above. A live comment on a professional account still depends on Meta app review, a public webhook URL, and an Instagram tester or advanced access. This document does not claim that a live Meta round-trip has been executed from this repository.

## Reviewer Demo Flow

Record this sequence against a professional Instagram account that the reviewer can comment on:

1. Open the dashboard and sign in.
2. Connect Instagram and confirm the professional account username is shown.
3. Open Automations → Create automation, select that account, then select the reel whose caption is the demo post.
4. Create a TRAIN automation for that reel: keywords `TRAIN`, `TRAIN LINK`, and `LINK`, action Send Private Reply, message `Hey! 👋 Here's the train link: https://example.com/train`, enabled.
5. Open that Instagram reel.
6. From a different Instagram account, comment `TRAIN`.
7. Confirm the commenter receives one private reply in Instagram inbox or message requests.
8. Open AutoDM → Activity and show the row with status `sent`.

The same keyword may exist on another reel with a different reply. A comment on a reel with no matching automation does not send a message.

## What is not implemented

- Public comment replies
- Follow-up DMs after the single private reply
- Content publishing, insights, or the Human Agent permission
- A live webhook subscription health ping. The system page shows Subscribed only after Instagram Login reports a successful `comments` subscription. Mock mode shows Mock subscription, not Connected.

## Reviewer test instructions

Provide the reviewer with:

- The SaaS URL
- A test login (email/password) that already has or can connect a professional Instagram account **owned by the reviewer or a test user added to the Meta app**
- The connected Instagram professional account handle
- A public post/reel on that account with a caption inviting the keyword `TRAIN`

Steps:

1. Log in to AutoDM
2. Confirm Instagram shows Connected
3. Confirm an enabled TRAIN automation exists
4. From a different Instagram account (or the reviewer’s tester account), comment `TRAIN`
5. Open Instagram inbox / message requests for the private reply
6. Open AutoDM → Activity and confirm status `sent`

Do not share access tokens, app secrets, or production encryption keys with reviewers.

## Screencast notes

Record:

- Landing page explaining comment → private reply
- Login
- Connect Instagram (OAuth consent screen)
- Connected account
- Create TRAIN automation
- Comment on Instagram
- Incoming activity row with sent status

## What AutoDM will not do

- Message people who did not comment
- Repeat DMs until someone follows
- Scrape Instagram in a browser
- Call unofficial Instagram APIs

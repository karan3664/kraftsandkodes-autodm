# Meta / Instagram setup

Use **Instagram API with Instagram Login** (Business Login for Instagram), not Facebook Login for Business, unless you later add Page-linked messaging.

Official references:

- [Instagram Platform](https://developers.facebook.com/docs/instagram-platform)
- [Private replies](https://developers.facebook.com/docs/instagram-platform/private-replies/)
- [Webhooks](https://developers.facebook.com/docs/instagram-platform/webhooks)

## Create / configure the Meta app

In [Meta for Developers](https://developers.facebook.com/apps):

1. Open the existing app (or create a **Business** type app).
2. Add the **Instagram** product and choose **Instagram API with Instagram Login**.
3. Set the OAuth redirect URI to:

   `https://app.kraftsandkodes.com/api/instagram/callback`

   Local:

   `http://localhost:3000/api/instagram/callback`

4. Copy the app ID and app secret into `META_APP_ID` and `META_APP_SECRET`. Never commit them.
5. Set `META_GRAPH_BASE_URL=https://graph.instagram.com`.
6. Set `META_API_VERSION` to the version you are approved to use (placeholder: `v23.0`).

## Permissions to request

Request only:

- `instagram_business_basic`
- `instagram_business_manage_comments`
- `instagram_business_manage_messages`

Do not request `instagram_business_content_publish`, `instagram_business_manage_insights`, or Human Agent unless a later feature needs them.

Private replies to comments require `instagram_business_basic` and `instagram_business_manage_comments`. `instagram_business_manage_messages` is included because the private reply is delivered as an Instagram message.

## OAuth flow in this product

1. Dashboard → **Connect Instagram** → `GET /api/instagram/connect`
2. Redirect to `https://www.instagram.com/oauth/authorize` with `response_type=code`
3. Callback `GET /api/instagram/callback`
4. Exchange code at `META_OAUTH_TOKEN_URL` (default `https://api.instagram.com/oauth/access_token`)
5. Exchange a long-lived token at `GET /{version}/access_token?grant_type=ig_exchange_token`
6. `GET /me?fields=user_id,username,name,profile_picture_url,account_type`
7. Encrypt and store the access token
8. `POST /me/subscribed_apps?subscribed_fields=comments`

Access tokens never leave the server. They are not returned in API JSON and are not logged.

## Professional account requirement

The Instagram account must be a professional (Business or Creator) account. Personal accounts cannot complete this Login flow.

## App mode

- **Development:** only users with a role on the Meta app can authorize.
- **Live:** required for production webhooks. Some comment webhook fields also need Advanced Access after App Review.

## What you must configure manually

These cannot be automated by the SaaS:

1. Meta app dashboard products and OAuth redirect URIs
2. Instagram webhook callback URL and verify token
3. Permission App Review / Advanced Access
4. Business verification (when Meta requires it)
5. Adding testers/developers while the app is in Development mode
6. HTTPS public URL (Hostinger + Nginx + Let’s Encrypt)

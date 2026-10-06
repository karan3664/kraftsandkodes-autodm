# Production architecture (locked)

Do not use tunnels, ngrok, trycloudflare, or other temporary hostnames in Razorpay, Meta, or production DNS.

```
                 kraftsandkodes.com
                       │
              Cloudflare DNS / SSL
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
kraftsandkodes.com          app.kraftsandkodes.com
   Landing                    SaaS
   Pricing                    Login
   Features                   Dashboard
   FAQ                        Automations
   Privacy / Terms            Instagram
   Refund / Contact           Settings
   Data deletion
          │                         │
          └───────────┬─────────────┘
                      ▼
                Hostinger VPS
                Nginx → Next.js
```

## Public URLs

| Surface                    | URL                                                   |
| -------------------------- | ----------------------------------------------------- |
| Website (Razorpay primary) | https://kraftsandkodes.com                            |
| App                        | https://app.kraftsandkodes.com                        |
| Instagram OAuth            | https://app.kraftsandkodes.com/api/instagram/callback |
| Instagram webhook          | https://app.kraftsandkodes.com/api/webhooks/instagram |
| Razorpay webhook           | https://app.kraftsandkodes.com/api/webhooks/razorpay  |

DNS is in **Cloudflare**, not Hostinger. Hostinger only runs the VPS.

Hostinger VPS IPv4 (srv1922175): **187.127.145.181**

## Cloudflare records

| Type  | Name  | Content            | Proxy   | TTL  |
| ----- | ----- | ------------------ | ------- | ---- |
| A     | `@`   | 187.127.145.181    | Proxied | Auto |
| CNAME | `www` | kraftsandkodes.com | Proxied | Auto |
| A     | `app` | 187.127.145.181    | Proxied | Auto |

Delete any leftover A records pointing at `54.149.79.189` / `34.216.117.25` if those are not this VPS.

SSL mode: **Full** until origin cert exists, then **Full (strict)**. Do not manage DNS in Hostinger.

## Razorpay

- Business name: **Karan Digital Labs**
- Product: **KRAFTSANDKODES AutoDM**
- Checkout brand: **KARAN DIGITAL LABS**
- Website URL: **https://kraftsandkodes.com**
- Webhook: **https://app.kraftsandkodes.com/api/webhooks/razorpay** (configure after the app is live on the VPS)

Do not submit Razorpay website verification until kraftsandkodes.com is publicly serving Privacy, Terms, Refund, Contact, and Data Deletion.

## Next step

Add the three Cloudflare records above, then deploy the stack on the VPS (`docs/HOSTINGER_DEPLOYMENT.md`).

# KryptoPay React Example

React + Vite example that:

1. Browser calls local `POST /api/create-intent`
2. Vite example server creates the intent with your API key
3. Browser receives `clientSecret`
4. `<KryptoPayModal />` opens checkout

## Setup

1. Install dependencies:
   - `npm install`
2. Copy env file:
   - `.env.example` to `.env`
3. Configure env vars:
   - `VITE_KRYPTOPAY_API_BASE_URL=http://localhost:3002`
   - `KRYPTOPAY_API_KEY=kp_test_xxx`
4. Start the example:
   - `npm run dev`

## Notes

- `KRYPTOPAY_API_KEY` is used server-side by the local Vite route.
- `VITE_KRYPTOPAY_API_KEY` is still accepted as a compatibility fallback, but server-only `KRYPTOPAY_API_KEY` is preferred.
- The browser uses same-origin `/v1/payment_intents/resolve`; the Vite server proxies that to `VITE_KRYPTOPAY_API_BASE_URL`.

# KryptoPay Vanilla Example

Vanilla JavaScript example that:

1. Creates a payment intent via `${VITE_KRYPTOPAY_API_BASE_URL}/v1/payment_intents`
2. Reads `client_secret` from the API response
3. Opens the SDK modal via `openKryptoPayModal`

## Setup

1. Install dependencies:
   - `npm install`
2. Copy env file:
   - `.env.example` to `.env`
3. Configure env vars:
   - `VITE_KRYPTOPAY_API_BASE_URL=http://localhost:3002`
   - `VITE_KRYPTOPAY_API_KEY=kp_test_xxx`
4. Run:
   - `npm run dev`

## Notes

- This example is wired for local development against your API.
- The public docs still recommend creating intents on your backend and returning only `client_secret` in production.

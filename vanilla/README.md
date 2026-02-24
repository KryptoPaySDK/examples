# KryptoPay Vanilla Example

Vanilla JavaScript example that:

1. Creates a payment intent via `POST /v1/payment_intents`
2. Reads `client_secret` from the API response
3. Opens the SDK modal via `openKryptoPayModal`

## Setup

1. Install dependencies:
   - `npm install`
2. Copy env file:
   - `.env.example` to `.env`
3. Run:
   - `npm run dev`

## Env vars

- `VITE_KRYPTOPAY_API_BASE_URL` (example: `http://localhost:3002`)
- `VITE_KRYPTOPAY_API_KEY` (merchant API key used to create intents)

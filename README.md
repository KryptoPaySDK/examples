# KryptoPay Examples

Example integrations for the KryptoPay SDK.

## Projects

- `react`: React + Vite example using `@kryptopay/sdk/react`
- `vanilla`: Plain JavaScript example using the SDK vanilla API

## Local setup

1. Install dependencies in the example folder you want to run.
2. Copy `.env.example` to `.env`.
3. Set:
   - `VITE_KRYPTOPAY_API_BASE_URL=http://localhost:3002`
   - `VITE_KRYPTOPAY_API_KEY=kp_test_xxx`
4. Run `npm run dev`.

Both examples are wired for local development against your API host. For production, follow the backend flow described in the public docs.

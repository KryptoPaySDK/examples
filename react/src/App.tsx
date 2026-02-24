import { useState } from "react";
import { KryptoPayModal } from "@kryptopay/sdk/react";
import type { KryptoPayCheckoutOptions } from "@kryptopay/sdk";

type Product = {
  id: string;
  name: string;
  priceUsd: number;
  description: string;
  imageUrl: string;
};

const product: Product = {
  id: "hoodie-001",
  name: "KryptoPay Hoodie",
  priceUsd: 20,
  description:
    "One product, one button. Testing the real KryptoPay API + SDK modal.",
  imageUrl:
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
};

const API_BASE_URL = import.meta.env.VITE_KRYPTOPAY_API_BASE_URL as
  | string
  | undefined; // http://localhost:3002
const API_KEY = import.meta.env.VITE_KRYPTOPAY_API_KEY as string | undefined;

type CreateIntentResponse = {
  // API returns snake_case for this endpoint.
  client_secret?: string;
  id?: string;
  status?: string;
  mode?: "testnet" | "mainnet";
  chain?: "base" | "polygon";
  amount_units?: number;
};

export default function App() {
  // UI state:
  // - `open`: controls modal visibility
  // - `clientSecret`: created on demand per checkout attempt
  // - `loading`: disables pay button while creating intent
  // - `log`: local event timeline for demo/debugging
  const [open, setOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  function pushLog(line: string) {
    setLog((prev) => [`${new Date().toLocaleTimeString()}  ${line}`, ...prev]);
  }

  // Server step:
  // Create an intent on your API, then hand only the returned client secret to the SDK modal.
  // Note: API key in browser is for local demo only; use a backend in production.
  async function createIntent(): Promise<string> {
    if (!API_BASE_URL) throw new Error("Missing VITE_KRYPTOPAY_API_BASE_URL");
    if (!API_KEY) throw new Error("Missing VITE_KRYPTOPAY_API_KEY");

    const url = `${API_BASE_URL}/v1/payment_intents`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        amount_units: Math.round(product.priceUsd * 1_000_000),
        lane: "sdk",
        chain: "polygon",
        metadata: { productId: product.id, productName: product.name },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Create intent failed: ${res.status} ${text}`);
    }

    const data = (await res.json()) as CreateIntentResponse;
    const cs = data.client_secret;

    if (!cs) {
      throw new Error("Create intent response missing client_secret");
    }

    return cs;
  }

  async function onPay() {
    try {
      setLoading(true);
      pushLog("Creating payment intent...");

      // Create a fresh intent per click so each checkout has its own lifecycle.
      const cs = await createIntent();
      setClientSecret(cs);

      pushLog(`Intent created. clientSecret=${cs}`);
      setOpen(true);
    } catch (err: unknown) {
      pushLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  const checkoutOptions: Omit<KryptoPayCheckoutOptions, "clientSecret"> = {
    // These options are static for this demo and spread into <KryptoPayModal />.
    merchantName: "KryptoPay Examples",
    defaultMethod: "wallet",
    allowWallet: true,
    allowManual: true,

    labels: {
      title: "Checkout",
      payWithWallet: "Pay with Wallet",
      payManually: "Pay Manually",
      connectWallet: "Connecting wallet...",
      switchNetwork: "Switching network...",
      sendPayment: "Confirm payment in wallet...",
      awaitingConfirmationTitle: "Payment awaiting confirmation",
      awaitingConfirmationBody:
        "We detected your payment. Confirmations may take a bit. You can close this and confirm later in your dashboard, or keep waiting here.",
      successTitle: "Payment successful",
      successBody: "Thanks. You can close this window.",
      close: "Close",
      keepWaiting: "Keep waiting",
    },

    onClose: () => {
      // Keep React state in sync when modal closes itself.
      pushLog("Modal closed");
      setOpen(false);
    },
    onSuccess: (e) => {
      pushLog(
        `Success: intentId=${e.payment_intent_id} tx=${e.tx_hash || "n/a"} chain=${e.chain} mode=${e.mode}`,
      );
      // SDK handles success countdown + auto-close UX.
    },
    onAwaitingConfirmation: (e) => {
      pushLog(
        `Awaiting confirmation: intentId=${e.payment_intent_id}`,
      );
    },
    onError: (e) => {
      pushLog(
        `SDK error: ${e.code} ${e.message} recoverable=${String(e.recoverable)}`,
      );
    },
  };

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            KryptoPay Examples
          </div>
          <div style={{ opacity: 0.75, marginTop: 4 }}>
            React product page. Pay button calls API then opens modal.
          </div>
        </div>

        <div style={{ fontSize: 12, opacity: 0.75 }}>
          API: <b>{API_BASE_URL ?? "missing"}</b>
        </div>
      </header>

      <main style={mainStyle}>
        <section style={cardStyle}>
          <img src={product.imageUrl} alt={product.name} style={imageStyle} />

          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{product.name}</div>
            <div style={{ marginTop: 6, opacity: 0.8 }}>
              {product.description}
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                ${product.priceUsd.toFixed(2)}
              </div>

              <button onClick={onPay} disabled={loading} style={buttonStyle}>
                {loading ? "Preparing..." : "Pay"}
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
              Using real API. API key comes from env (VITE_KRYPTOPAY_API_KEY).
            </div>
          </div>
        </section>

        <section style={logCardStyle}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Logs</div>
          <div style={logBoxStyle}>
            {log.length === 0 ? (
              <div style={{ opacity: 0.6 }}>No logs yet</div>
            ) : null}
            {log.map((line, idx) => (
              <div key={idx} style={{ marginBottom: 6 }}>
                {line}
              </div>
            ))}
          </div>
        </section>
      </main>

      {clientSecret ? (
        <KryptoPayModal
          // Render only when we have a client secret from createIntent().
          open={open}
          clientSecret={clientSecret}
          baseUrl={API_BASE_URL} // SDK will call resolve/poll against this
          {...checkoutOptions}
        />
      ) : null}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  padding: 20,
  maxWidth: 980,
  margin: "0 auto",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 18,
};

const mainStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
};

const cardStyle: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.1)",
  borderRadius: 16,
  overflow: "hidden",
  background: "black",
};

const logCardStyle: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.1)",
  borderRadius: 16,
  background: "black",
  padding: 16,
};

const imageStyle: React.CSSProperties = {
  width: "100%",
  height: 260,
  objectFit: "cover",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid rgba(231, 231, 231, 0.15)",
  background: "#202020",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

const logBoxStyle: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: 12,
  padding: 12,
  height: 320,
  overflow: "auto",
  fontSize: 12,
  lineHeight: 1.35,
  background: "rgba(0,0,0,0.02)",
};


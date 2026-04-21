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
  priceUsd: 0.5,
  description:
    "One product, one button. The browser asks the local example server for a client secret, then opens the SDK modal.",
  imageUrl:
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
};

const API_BASE_URL = import.meta.env.VITE_KRYPTOPAY_API_BASE_URL as
  | string
  | undefined;
const CREATE_INTENT_ENDPOINT = "/api/create-intent";
const SDK_BASE_URL = "";

type CreateIntentResponse = {
  clientSecret?: string;
};

export default function App() {
  const [open, setOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  function pushLog(line: string) {
    setLog((prev) => [`${new Date().toLocaleTimeString()}  ${line}`, ...prev]);
  }

  async function createIntent(): Promise<string> {
    if (!API_BASE_URL) throw new Error("Missing VITE_KRYPTOPAY_API_BASE_URL");

    const res = await fetch(CREATE_INTENT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amountUnits: Math.round(product.priceUsd * 1_000_000),
        chain: "polygon",
        orderId: `demo_${Date.now()}`,
        metadata: { productId: product.id, productName: product.name },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Create intent failed: ${res.status} ${text}`);
    }

    const data = (await res.json()) as CreateIntentResponse;
    const cs = data.clientSecret;

    if (!cs) {
      throw new Error("Create intent response missing clientSecret");
    }

    return cs;
  }

  async function onPay() {
    try {
      setLoading(true);
      pushLog("Creating payment intent through /api/create-intent...");

      const cs = await createIntent();
      setClientSecret(cs);

      pushLog("Intent created. Opening checkout...");
      setOpen(true);
    } catch (err: unknown) {
      pushLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  const checkoutOptions: Omit<KryptoPayCheckoutOptions, "clientSecret"> = {
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
      pushLog("Modal closed");
      setOpen(false);
    },
    onSuccess: (e) => {
      pushLog(
        `Success: intentId=${e.payment_intent_id} tx=${e.tx_hash || "n/a"} chain=${e.chain} mode=${e.mode}`,
      );
    },
    onAwaitingConfirmation: (e) => {
      pushLog(`Awaiting confirmation: intentId=${e.payment_intent_id}`);
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
            React product page. Pay button calls a local server route then opens
            modal.
          </div>
        </div>

        <div style={{ fontSize: 12, opacity: 0.75 }}>
          API: <b>{API_BASE_URL ?? "missing"}</b> via{" "}
          <b>{CREATE_INTENT_ENDPOINT}</b>
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
              Intent creation happens server-side in the Vite example server.
              The browser only receives clientSecret.
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
          open={open}
          clientSecret={clientSecret}
          baseUrl={SDK_BASE_URL}
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

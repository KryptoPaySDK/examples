import "./style.css";
import { openKryptoPayModal } from "@kryptopay/sdk";

const API_BASE_URL = import.meta.env.VITE_KRYPTOPAY_API_BASE_URL;
const API_KEY = import.meta.env.VITE_KRYPTOPAY_API_KEY;

const product = {
  id: "hoodie-001",
  name: "KryptoPay Hoodie",
  priceUsd: 20,
  description:
    "One product, one button. Testing the real KryptoPay API + SDK modal.",
  imageUrl:
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
};

/** @type {{ close: () => void, getState: () => unknown } | null} */
let modalHandle = null;
let loading = false;

const app = document.querySelector("#app");
app.innerHTML = `
  <header class="header">
    <div>
      <div style="font-size: 18px; font-weight: 700;">KryptoPay Examples</div>
      <div style="opacity: 0.75; margin-top: 4px;">
        Vanilla JS product page. Pay button calls API then opens modal.
      </div>
    </div>
    <div class="muted">API: <b id="api-base">${API_BASE_URL ?? "missing"}</b></div>
  </header>

  <main class="main">
    <section class="card">
      <img src="${product.imageUrl}" alt="${product.name}" />
      <div class="card-content">
        <div style="font-size: 18px; font-weight: 700;">${product.name}</div>
        <div style="margin-top: 6px; opacity: 0.82;">${product.description}</div>
        <div class="row">
          <div style="font-size: 18px; font-weight: 700;">$${product.priceUsd.toFixed(2)}</div>
          <button id="pay-btn" class="pay-btn">Pay</button>
        </div>
        <div class="muted" style="margin-top: 10px;">
          Using real API. API key comes from env (VITE_KRYPTOPAY_API_KEY).
        </div>
      </div>
    </section>

    <section class="logs">
      <div style="font-weight: 700;">Logs</div>
      <div id="log-box" class="log-box">
        <div id="empty-log" style="opacity: 0.6;">No logs yet</div>
      </div>
    </section>
  </main>
`;

const payBtn = document.querySelector("#pay-btn");
const logBox = document.querySelector("#log-box");
const emptyLog = document.querySelector("#empty-log");

function pushLog(message) {
  if (emptyLog) emptyLog.style.display = "none";
  const line = document.createElement("div");
  line.className = "log-line";
  line.textContent = `${new Date().toLocaleTimeString()}  ${message}`;
  logBox.prepend(line);
}

function setLoading(next) {
  loading = next;
  if (!payBtn) return;
  payBtn.disabled = next;
  payBtn.textContent = next ? "Preparing..." : "Pay";
}

async function createIntent() {
  if (!API_BASE_URL) {
    throw new Error("Missing VITE_KRYPTOPAY_API_BASE_URL");
  }
  if (!API_KEY) {
    throw new Error("Missing VITE_KRYPTOPAY_API_KEY");
  }

  const response = await fetch(`${API_BASE_URL}/v1/payment_intents`, {
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

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Create intent failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  if (!data?.client_secret) {
    throw new Error("Create intent response missing client_secret");
  }

  return data.client_secret;
}

async function onPay() {
  if (loading) return;

  try {
    setLoading(true);
    pushLog("Creating payment intent...");

    const clientSecret = await createIntent();
    pushLog(`Intent created. clientSecret=${clientSecret}`);

    modalHandle = openKryptoPayModal({
      clientSecret,
      baseUrl: API_BASE_URL,
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
        modalHandle = null;
      },
      onSuccess: (event) => {
        pushLog(
          `Success: intentId=${event.payment_intent_id} tx=${event.tx_hash || "n/a"} chain=${event.chain} mode=${event.mode}`,
        );
      },
      onAwaitingConfirmation: (event) => {
        pushLog(`Awaiting confirmation: intentId=${event.payment_intent_id}`);
      },
      onError: (event) => {
        pushLog(
          `SDK error: ${event.code} ${event.message} recoverable=${String(event.recoverable)}`,
        );
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    pushLog(`Error: ${message}`);
  } finally {
    setLoading(false);
  }
}

payBtn?.addEventListener("click", onPay);

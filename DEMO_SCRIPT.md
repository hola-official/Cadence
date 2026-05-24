# Cadence Protocol — Demo Script

## Tabs to open before starting

| # | What | URL |
|---|------|-----|
| 1 | Merchant store | http://localhost:3002 |
| 2 | Cadence app | http://localhost:5173 |
| 3 | Arc explorer | https://testnet.arcscan.app |
| 4 | Relayer health | https://cadence-relayer.onrender.com/health |

**Start all 3 servers before presenting:**
```
# Terminal 1
cd relayer && npm run dev

# Terminal 2
cd frontend && npm run dev

# Terminal 3
cd examples/merchant-checkout/merchant-server && node server.js
```

---

## Script

---

**[0:00 — Hook]**

"Every recurring payment on the internet runs through a middleman — Stripe, PayPal, Braintree. They take 3–5% of every charge, they hold your money, and they can cut you off at any time.

Cadence replaces them with a smart contract. No middleman, no custody, half the fee — and now, AI agents that can transact autonomously."

---

**[0:25 — Merchant Store]**

*Open `http://localhost:3002`*

"This is a merchant's storefront integrated with Cadence. Plans are fetched live from our relayer. Any developer can drop this into their site with a few lines of code."

*Point at a plan — billing every 60 seconds for demo*

"We've set billing to every 60 seconds so you can watch recurring charges happen in real time. Click Subscribe."

---

**[0:50 — Checkout on Arc]**

*Checkout opens at `localhost:5173/checkout`*

"This is the Cadence hosted checkout — running on **Arc**, a new L1 built for sub-second finality and $0.01 USDC fees. Perfect for recurring micropayments.

Passkey login — no seed phrase, no MetaMask. Circle Modular Wallets handle smart account creation under the hood."

*Complete passkey auth + one-time USDC approval*

"First-time users do a one-time wallet setup — this approves USDC to the policy manager contract. After that, every future subscription is one tap."

*Show confirm screen — merchant address, amount, interval, spending cap*

"Full transparency. The user sees exactly what they're authorizing, enforced on-chain. One tap."

*Click Confirm + passkey*

---

**[1:30 — On-Chain Proof]**

*Success screen — copy the tx hash*

"The subscription is now a live policy on Arc. Let's verify it."

*Open `https://testnet.arcscan.app`, paste tx hash*

"Here's the `PolicyCreated` event — merchant address, charge amount, billing interval — all immutable. This isn't a database row. The rules are set in the contract and the relayer enforces them automatically."

---

**[2:00 — AI Payment Agent]**

*Navigate to `http://localhost:5173` → Agent tab*

"Now here's where it gets interesting. Cadence ships with an AI agent — registered onchain via **ERC-8004** identity standard, validated on Arc."

*Point at the ERC-8004 badge in the sidebar*

"The agent can read your subscriptions, analyze spending, and act on your behalf. Let's ask it something."

*Type in chat: `Show my active subscriptions and ecosystem stats`*

"It calls the Cadence relayer, reads live on-chain data, and responds — balance, active policies, total volume across all users."

---

**[2:35 — Agentic Commerce — ERC-8183]**

*Click Jobs tab in sidebar*

"This is the **ERC-8183** agentic commerce standard — an onchain job marketplace where clients post work, agents execute it, and USDC escrow is released on completion.

Let's have the agent post a job — right from this chat."

*Type in chat: `Post an ERC-8183 job to analyze my spending patterns and flag unused subscriptions. Budget 1 USDC, 3 day expiry.`*

"The agent just sent 4 transactions on Arc — createJob, setBudget, approve USDC, fund escrow. Sub-second each. The job is now Funded on-chain."

*Click the Arcscan link in the reply — show the job on explorer*
*Jobs tab refreshes — job appears with #id and Funded status*

---

**[3:05 — Agent Completes the Job]**

*Type in chat: `Submit job #<id> with deliverable: analyzed 3 subscriptions, flagged 2 unused`*

"Provider submits the deliverable — a hash of the result, written on-chain."

*Wait for reply — status: Submitted*

*Type in chat: `Complete job #<id>`*

"Evaluator approves — USDC escrow is released to the provider. The whole lifecycle, orchestrated by an AI agent, executed on a blockchain with sub-second finality."

*Show Jobs tab — status flips to Completed*

---

**[3:30 — x402 Paywall]**

"One more thing. We've implemented **x402** — an emerging HTTP standard for pay-per-use APIs.

Any AI agent or script can call our analytics endpoint. No API key, no account — just pay $0.001 USDC per request using an EIP-3009 off-chain signature."

*In relayer terminal:*
```
npx tsx scripts/test-x402.ts
```

"Step 1: 402 — payment required. Step 2: sign authorization off-chain. Step 3: 200 — live ecosystem analytics. This is machine-to-machine micropayments. HTTP-native, no wallet popup."

---

**[4:00 — Close]**

"To recap — a user subscribed with a passkey, funds stayed in their own wallet, the merchant received USDC directly on-chain at 2.5% fee. An AI agent created an ERC-8183 job, executed it, and got paid — autonomously. And a paywall API accepted a $0.001 USDC micropayment over HTTP.

Three payment primitives — subscriptions, agentic commerce, and pay-per-use — all on Arc. That's Cadence."

---

## Key Numbers

| Metric | Value |
|--------|-------|
| Protocol fee | 2.5% |
| Traditional processors | 3–5% |
| Arc finality | Sub-second |
| Arc tx fee | ~$0.01 USDC |
| x402 price | $0.001 USDC per request |
| Auth method | Passkey (no seed phrase) |
| Agent standard | ERC-8004 (identity + validation) |
| Job standard | ERC-8183 (agentic commerce) |

## Contract Addresses (Arc Testnet — Chain ID 5042002)

| Contract | Address |
|----------|---------|
| PolicyManager | `0xe3463a10Cb69D9705A38cECac3cBC58AD76f5De1` |
| ERC-8183 Jobs | `0x0747EEf0706327138c69792bF28Cd525089e4583` |
| USDC | `0x3600000000000000000000000000000000000000` |
| Agent ID | `#19354` |
| Relayer | `https://cadence-relayer.onrender.com` |

# Cadence — Complete Setup & Environment Guide

## Table of Contents

- [How It All Works Together](#how-it-all-works-together)
- [System Requirements](#system-requirements)
- [Environment Variables](#environment-variables)
  - [Frontend (.env)](#1-frontend-env)
  - [Relayer (.env)](#2-relayer-env)
  - [Contracts (.env)](#3-contracts-env)
  - [Merchant Example (.env)](#4-merchant-example-env)
- [Step-by-Step Setup](#step-by-step-setup)
  - [Step 1: Get Circle Credentials](#step-1-get-circle-credentials)
  - [Step 2: Set Up PostgreSQL](#step-2-set-up-postgresql)
  - [Step 3: Create Wallets](#step-3-create-wallets)
  - [Step 4: Get Testnet USDC](#step-4-get-testnet-usdc)
  - [Step 5: Start the Relayer](#step-5-start-the-relayer)
  - [Step 6: Start the Frontend](#step-6-start-the-frontend)
  - [Step 7: (Optional) Deploy Contracts](#step-7-optional-deploy-contracts)
  - [Step 8: (Optional) Run the Merchant Example](#step-8-optional-run-the-merchant-example)
- [How the Components Connect](#how-the-components-connect)
- [Troubleshooting](#troubleshooting)

---

## How It All Works Together

Cadence is a non-custodial crypto subscription system with 4 components:

```
USER (browser)
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  FRONTEND (React app on localhost:5173)                  │
│  - User logs in with passkey (WebAuthn)                  │
│  - Circle creates a smart wallet (no seed phrase)        │
│  - User approves USDC spending to the contract           │
│  - User subscribes → calls createPolicy() on-chain       │
│  - Gas is FREE (Circle paymaster sponsors it)            │
└────────────────────────┬────────────────────────────────┘
                         │ UserOperation (ERC-4337)
                         ▼
┌─────────────────────────────────────────────────────────┐
│  SMART CONTRACT (ArcPolicyManager on Arc Testnet)        │
│  - Stores subscription policies on-chain                 │
│  - Executes first charge immediately on subscribe        │
│  - Relayer calls charge() for recurring payments         │
│  - 2.5% protocol fee deducted, rest goes to merchant     │
│  - Auto-cancels after 3 consecutive failed charges       │
└────────────────────────┬────────────────────────────────┘
                         │ Events (PolicyCreated, ChargeSucceeded, etc.)
                         ▼
┌─────────────────────────────────────────────────────────┐
│  RELAYER (Node.js service on localhost:3001)              │
│  - Indexer: polls blockchain events every 15 seconds     │
│  - Executor: charges due policies every 60 seconds       │
│  - Webhooks: notifies merchants of payments every 10s    │
│  - Stores everything in PostgreSQL                       │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP POST with HMAC signature
                         ▼
┌─────────────────────────────────────────────────────────┐
│  MERCHANT (your backend using the SDK)                   │
│  - Receives webhook: "charge.succeeded"                  │
│  - Verifies signature with @cadence/sdk          │
│  - Grants/revokes access to the paying user              │
└─────────────────────────────────────────────────────────┘
```

**The end-to-end flow:**

1. Merchant generates a checkout URL using the SDK
2. User visits the URL → frontend loads → user authenticates with passkey
3. User's smart wallet approves USDC to the contract (one-time, gas-free)
4. User clicks "Subscribe" → `createPolicy()` runs on-chain → first charge happens
5. Relayer picks up the `PolicyCreated` event → stores in DB → sends webhook to merchant
6. Every billing cycle, the relayer calls `charge()` → USDC transfers → webhook sent
7. If the user runs out of USDC 3 times in a row → auto-cancelled

---

## System Requirements

| Tool | Version | Required For |
|------|---------|--------------|
| **Node.js** | >= 20.x | Frontend, Relayer, SDK, Examples |
| **npm** | >= 9.x | Package management (comes with Node) |
| **PostgreSQL** | >= 14 | Relayer database (or use Docker) |
| **Docker** | Latest | Easiest way to run Postgres + Relayer |
| **Foundry** | Latest | Only if deploying/testing contracts |
| **Git** | Any | Clone the repo |

---

## Environment Variables

### 1. Frontend (.env)

Create the file at `frontend/.env`:

```env
# ═══════════════════════════════════════════════════════════════
# REQUIRED — App will show "Not Configured" screen without these
# ═══════════════════════════════════════════════════════════════

VITE_CLIENT_KEY=your-circle-client-key
VITE_CLIENT_URL=https://modular-wallets.circle.com/v1/w3s

# ═══════════════════════════════════════════════════════════════
# OPTIONAL — Enhanced features (app works without these)
# ═══════════════════════════════════════════════════════════════

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
```

#### How to get each variable:

**`VITE_CLIENT_KEY`** (Required)
> This is your Circle Modular Wallets API key. It enables passkey authentication and gas-free transactions.
1. Go to [console.circle.com](https://console.circle.com)
2. Sign up or log in
3. Create a new project (or select existing)
4. Navigate to **Modular Wallets** in the sidebar
5. Click **"Create a Client Key"** (or find existing)
6. Copy the **Client Key** value
7. It looks like: `csk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`

**`VITE_CLIENT_URL`** (Required)
> The Circle Modular Wallets API endpoint. This is the base URL the frontend uses to communicate with Circle's infrastructure for wallet creation, UserOps, and paymaster.
1. Same Circle Console page as above
2. The URL is shown alongside your client key
3. For testnet it is: `https://modular-wallets.circle.com/v1/w3s`
4. Use exactly this URL unless Circle's docs say otherwise

**`VITE_SUPABASE_URL`** (Optional)
> Used by the frontend to read subscription/charge history directly from the relayer's database via Supabase. Without this, the Activity page won't show data.
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **Settings** → **API**
4. Copy the **Project URL** (looks like `https://abcdefgh.supabase.co`)
5. Note: You must point this Supabase project at the same Postgres database the relayer uses, OR set up Supabase as the relayer's database

**`VITE_SUPABASE_ANON_KEY`** (Optional)
> The public (anon) key for Supabase. Safe to expose in frontend code — it only has read access via Row Level Security.
1. Same Supabase project → **Settings** → **API**
2. Copy the **anon / public** key
3. It looks like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**`VITE_WALLETCONNECT_PROJECT_ID`** (Optional)
> Enables WalletConnect as a connection option for the cross-chain bridge (funding your smart wallet from MetaMask mobile, etc.). Without this, only injected wallets (MetaMask extension) work for bridging.
1. Go to [cloud.walletconnect.com](https://cloud.walletconnect.com)
2. Sign up and create a new project
3. Copy the **Project ID**
4. It looks like: `a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4`

---

### 2. Relayer (.env)

Create the file at `relayer/.env`:

```env
# ═══════════════════════════════════════════════════════════════
# REQUIRED — Relayer will not start without these
# ═══════════════════════════════════════════════════════════════

DATABASE_URL=postgres://autopay:password@localhost:5432/autopay
RELAYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# ═══════════════════════════════════════════════════════════════
# OPTIONAL — Defaults are fine for local development
# ═══════════════════════════════════════════════════════════════

ARC_TESTNET_RPC=https://rpc.testnet.arc.network
PORT=3001
LOG_LEVEL=info
RETRY_PRESET=standard

# Only if RETRY_PRESET=custom:
# RETRY_MAX_RETRIES=3
# RETRY_BACKOFF_MS=60000,300000,900000
# RETRY_MAX_CONSECUTIVE_FAILURES=3

# Only process specific merchants (empty = all):
# MERCHANT_ADDRESSES=0xabc...,0xdef...
```

#### How to get each variable:

**`DATABASE_URL`** (Required)
> Connection string for PostgreSQL. The relayer stores policies, charges, webhooks, and indexer state here.

Option A — **Docker** (easiest, recommended for local dev):
1. The `docker-compose.yml` in `relayer/docker/` starts Postgres automatically
2. Default URL: `postgres://autopay:password@localhost:5432/autopay`
3. Just run `docker compose up db -d` from `relayer/docker/`

Option B — **Supabase** (free hosted Postgres):
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings** → **Database**
3. Copy the **Connection string** (URI format)
4. Replace `[YOUR-PASSWORD]` with your DB password
5. Looks like: `postgres://postgres.abc:password@aws-0-us-east.pooler.supabase.com:6543/postgres`

Option C — **Neon** (free serverless Postgres):
1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string from the dashboard

Option D — **Local Postgres**:
1. Install PostgreSQL locally
2. Create a database: `createdb autopay`
3. URL: `postgres://youruser:yourpassword@localhost:5432/autopay`

**`RELAYER_PRIVATE_KEY`** (Required)
> The private key of the wallet that calls `charge()` on the smart contract. This wallet pays gas fees for executing recurring charges on Arc testnet.
1. Generate a new wallet:
   - With Foundry: `cast wallet new`
   - With Node.js: `node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"`
   - Or export from MetaMask: Account → Details → Export Private Key
2. Must start with `0x`
3. **Fund this wallet** with native tokens on Arc testnet for gas (see Step 4 below)
4. This wallet does NOT hold user funds — it only pays gas to call `charge()`

**`ARC_TESTNET_RPC`** (Optional)
> The RPC endpoint for Arc testnet. Default is the public endpoint.
- Default: `https://rpc.testnet.arc.network`
- Only change if you have a private/faster RPC provider

**`PORT`** (Optional)
> The port the relayer API server listens on.
- Default: `3001`
- The health check, metadata API, and logo serving all use this port

**`LOG_LEVEL`** (Optional)
> Controls how verbose the relayer logs are.
- `debug` — Everything (very noisy, good for debugging)
- `info` — Normal operations (default, recommended)
- `warn` — Only warnings and errors
- `error` — Only errors

**`RETRY_PRESET`** (Optional)
> Controls how aggressively the relayer retries failed charges.
- `aggressive` — Retries after 30s, 1min, 2min (3 retries max)
- `standard` — Retries after 1min, 5min, 15min (3 retries max) **(default)**
- `conservative` — Retries after 5min, 15min, 30min, 1hr, 2hr (5 retries max)
- `custom` — Set your own values with `RETRY_MAX_RETRIES`, `RETRY_BACKOFF_MS`, `RETRY_MAX_CONSECUTIVE_FAILURES`

**`MERCHANT_ADDRESSES`** (Optional)
> Comma-separated list of merchant addresses to process. When set, the relayer will ONLY index and charge policies for these merchants. When empty/unset, it processes all merchants.
- Example: `MERCHANT_ADDRESSES=0x2B8b9182c1c3A9bEf4a60951D9B7F49420D12B9B`
- Useful for running a dedicated relayer for specific merchants

---

### 3. Contracts (.env)

Create the file at `contracts/.env`:

> **Note:** You only need this if you are deploying or redeploying the smart contract. The contract is already deployed on Arc Testnet — the frontend and relayer use the existing deployment by default.

```env
# ═══════════════════════════════════════════════════════════════
# REQUIRED FOR DEPLOYMENT
# ═══════════════════════════════════════════════════════════════

PRIVATE_KEY=0xYOUR_DEPLOYER_PRIVATE_KEY
FEE_RECIPIENT=0xYOUR_ADDRESS_TO_RECEIVE_FEES

# ═══════════════════════════════════════════════════════════════
# OPTIONAL
# ═══════════════════════════════════════════════════════════════

ARC_TESTNET_RPC=https://rpc.testnet.arc.network
```

#### How to get each variable:

**`PRIVATE_KEY`** (Required for deploy)
> The private key of the wallet that deploys the contract. This wallet needs Arc testnet native tokens for gas.
1. Generate or use an existing wallet (same as relayer wallet, or a separate one)
2. Fund with testnet tokens from [faucet.circle.com](https://faucet.circle.com)

**`FEE_RECIPIENT`** (Required for deploy)
> The address that receives the 2.5% protocol fee from every charge. This is set in the contract constructor.
1. Use any wallet address you control
2. Current deployment uses: `0x2B8b9182c1c3A9bEf4a60951D9B7F49420D12B9B`

---

### 4. Merchant Example (.env)

Create the file at `examples/merchant-checkout/merchant-server/.env`:

> **Note:** This is only needed if you want to run the example merchant integration.

```env
# ═══════════════════════════════════════════════════════════════
# REQUIRED
# ═══════════════════════════════════════════════════════════════

MERCHANT_ADDRESS=0xYOUR_MERCHANT_WALLET_ADDRESS
CHECKOUT_URL=http://localhost:5173/checkout
RELAYER_URL=http://localhost:3001
WEBHOOK_SECRET=test-secret-123

# ═══════════════════════════════════════════════════════════════
# OPTIONAL
# ═══════════════════════════════════════════════════════════════

PORT=3002
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

#### How to get each variable:

**`MERCHANT_ADDRESS`** (Required)
> The wallet address that receives USDC payments (minus 2.5% fee).
- Use any wallet address you control on Arc testnet

**`CHECKOUT_URL`** (Required)
> The URL where the AutoPay frontend's checkout page is running.
- Local development: `http://localhost:5173/checkout`
- Production: `https://your-domain.com/checkout`

**`RELAYER_URL`** (Required)
> The URL where the relayer API is running. Used for serving plan metadata.
- Local development: `http://localhost:3001`
- Docker: `http://localhost:3001`

**`WEBHOOK_SECRET`** (Required)
> A shared secret between the merchant server and the relayer. The relayer signs webhook payloads with this secret using HMAC-SHA256, and the merchant verifies the signature.
- For local dev: use any string like `test-secret-123`
- For production: use a long random string (32+ characters)
- **Must match** what's stored in the relayer's `merchants` table for your merchant address

---

## Step-by-Step Setup

### Step 1: Get Circle Credentials

1. Go to [console.circle.com](https://console.circle.com)
2. Create an account (free)
3. Create a new project
4. Enable **Modular Wallets** (Programmable Wallets section)
5. Create a **Client Key** for testnet
6. Note down:
   - **Client Key**: `csk_test_...`
   - **Client URL**: `https://modular-wallets.circle.com/v1/w3s`

### Step 2: Set Up PostgreSQL

**Option A: Docker (Recommended)**
```bash
cd relayer/docker
docker compose up db -d
```
This starts Postgres on `localhost:5432` with:
- Database: `autopay`
- User: `autopay`
- Password: `password`

**Option B: Supabase/Neon (Cloud)**
- Create a free project and copy the connection string

### Step 3: Create Wallets

You need a **relayer wallet** — this wallet pays gas to execute charges:

```bash
# If you have Foundry installed:
cast wallet new

# Or with Node.js:
node -e "const c=require('crypto');const k='0x'+c.randomBytes(32).toString('hex');const{createPublicClient}=require('viem');console.log('Private Key:',k)"
```

Save the private key — you'll use it as `RELAYER_PRIVATE_KEY`.

### Step 4: Get Testnet USDC

The relayer wallet needs **native tokens** (for gas) on Arc Testnet:

1. Go to [faucet.circle.com](https://faucet.circle.com)
2. Select **Arc Testnet**
3. Paste your relayer wallet address
4. Request testnet tokens

For testing subscriptions, your **user wallet** (created via passkey in the frontend) needs USDC:

1. Same faucet: [faucet.circle.com](https://faucet.circle.com)
2. Select **Arc Testnet** → **USDC**
3. Paste your smart wallet address (shown in the frontend after login)
4. Or use the **Bridge** page in the frontend to transfer USDC from other testnets

### Step 5: Start the Relayer

```bash
cd relayer

# Create .env file
cp .env.example .env
# Edit .env — fill in DATABASE_URL and RELAYER_PRIVATE_KEY

# Start in development mode (with hot reload)
npm run dev
```

You should see:
```
INFO: Starting AutoPay relayer...
INFO: Relayer wallet: 0x...
INFO: Running database migrations...
INFO: API server listening { port: 3001 }
INFO: Starting indexer loop { chainId: 5042002 }
INFO: Starting executor loop { runIntervalMs: 60000 }
INFO: Starting webhook sender loop
INFO: All services started
```

Verify it's running: open [http://localhost:3001/health](http://localhost:3001/health)

### Step 6: Start the Frontend

```bash
cd frontend

# Create .env file with your Circle credentials
cat > .env << 'EOF'
VITE_CLIENT_KEY=your-circle-client-key-here
VITE_CLIENT_URL=https://modular-wallets.circle.com/v1/w3s
EOF

# Start the dev server
npm run dev
```

You should see:
```
VITE v5.x.x  ready in XXXms

➜  Local:   http://localhost:5173/
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Step 7: (Optional) Deploy Contracts

> **Skip this step** unless you need to deploy a fresh contract. The existing deployment on Arc Testnet works out of the box.

```bash
# Install Foundry (if not installed)
curl -L https://foundry.paradigm.xyz | bash
foundryup

cd contracts

# Create .env
cp .env.example .env
# Edit .env — fill in PRIVATE_KEY and FEE_RECIPIENT

# Install Solidity dependencies (if not already)
forge install

# Run tests
forge test -vv

# Deploy to Arc Testnet
make deploy-arc

# After deploy: sync ABIs and addresses to frontend + relayer
make sync
```

### Step 8: (Optional) Run the Merchant Example

```bash
cd examples/merchant-checkout/merchant-server

# Create .env
cp .env.example .env
# Edit .env — fill in MERCHANT_ADDRESS, etc.

# Install and start
npm install
node server.js
```

Opens on [http://localhost:3002](http://localhost:3002) — shows example subscription plans.

---

## How the Components Connect

### Startup Order

Start services in this order (each must be running before the next depends on it):

```
1. PostgreSQL (database)        ← Relayer needs this
2. Relayer (indexer + executor) ← Needs database, talks to blockchain
3. Frontend (React app)         ← Needs Circle credentials, talks to blockchain + relayer
4. Merchant Server (optional)   ← Needs relayer URL + frontend URL
```

### Port Map

| Service | Default Port | Purpose |
|---------|-------------|---------|
| Frontend | `5173` | Vite dev server |
| Relayer API | `3001` | Health, metadata, logos |
| PostgreSQL | `5432` | Database |
| Merchant Example | `3002` | Example merchant app |

### What Talks to What

```
Frontend ──HTTP──> Arc RPC (https://rpc.testnet.arc.network)
         ──HTTP──> Circle API (modular-wallets.circle.com)
         ──HTTP──> Supabase (optional, for reading activity)
         ──HTTP──> Relayer API (localhost:3001, for metadata)
         ──HTTP──> Gateway API (gateway-api-testnet.circle.com, for bridging)

Relayer  ──HTTP──> Arc RPC (reads events, sends charge transactions)
         ──TCP───> PostgreSQL (stores policies, charges, webhooks)
         ──HTTP──> Merchant webhook URLs (delivers payment notifications)

Contract ──────── Lives on Arc Testnet blockchain (no external connections)

Merchant ──HTTP──> Relayer API (serves plan metadata)
         ──HTTP──> Frontend checkout URL (redirects users)
         ──TCP───> Supabase (optional, tracks subscribers)
```

### Data Lifecycle

```
SUBSCRIPTION CREATED:
  Frontend → sendUserOperation(createPolicy) → Bundler → Contract
  Contract emits PolicyCreated event
  Relayer indexer polls → sees PolicyCreated → inserts into DB → queues webhook
  Relayer webhook sender → POSTs to merchant URL

RECURRING CHARGE:
  Relayer executor queries: SELECT * FROM policies WHERE next_charge_at <= NOW()
  Relayer → readContract(canCharge) → simulateContract(charge) → writeContract(charge)
  Contract transfers USDC: payer → contract → merchant (minus 2.5% fee)
  Contract emits ChargeSucceeded event
  Relayer updates DB → queues webhook → POSTs to merchant

CANCELLATION (user):
  Frontend → sendUserOperation(revokePolicy) → Bundler → Contract
  Contract emits PolicyRevoked → Relayer indexes → webhook sent

AUTO-CANCELLATION (3 failures):
  Relayer detects 3 consecutive soft-fails → calls cancelFailedPolicy()
  Contract emits PolicyCancelledByFailure → Relayer marks inactive → webhook sent
```

---

## Troubleshooting

### Frontend shows "Not Configured" screen
- You're missing `VITE_CLIENT_KEY` or `VITE_CLIENT_URL` in `frontend/.env`
- Make sure the `.env` file is in the `frontend/` directory (not the root)
- Restart the dev server after changing `.env` (`npm run dev`)

### Passkey registration fails
- Make sure `VITE_CLIENT_KEY` is a valid Circle testnet client key
- Check browser console for errors — Circle's API will return descriptive messages
- Passkeys require HTTPS in production (localhost works for development)

### Relayer won't start: "Missing required environment variable"
- Check that `relayer/.env` has both `DATABASE_URL` and `RELAYER_PRIVATE_KEY`
- `RELAYER_PRIVATE_KEY` must start with `0x`

### Relayer: "Database connection failed"
- Make sure PostgreSQL is running (`docker compose up db -d` or check your cloud DB)
- Verify the `DATABASE_URL` format: `postgres://user:password@host:port/database`
- Test connection: `psql $DATABASE_URL -c "SELECT 1"`

### Relayer: "Indexer error" / no events found
- The indexer starts from block `26573469` (when the contract was deployed)
- First run may take a moment to catch up with current block
- Check `LOG_LEVEL=debug` for detailed indexer output

### Charges not executing
- Make sure the relayer wallet has gas tokens on Arc testnet
- Check the payer's USDC balance and allowance (must have approved the PolicyManager)
- The executor runs every 60 seconds — wait at least 1 minute
- Check relayer logs for `"Processing due charges"` messages

### Webhooks not delivering
- Merchant must be registered in the `merchants` table with `webhook_url` and `webhook_secret`
- Insert manually: `INSERT INTO merchants (address, webhook_url, webhook_secret) VALUES ('0x...', 'http://localhost:3002/webhook', 'test-secret-123')`
- Check relayer logs for webhook delivery status

### Cross-chain bridge fails
- You need testnet USDC on the source chain (Sepolia, Base, etc.)
- Get testnet USDC from [faucet.circle.com](https://faucet.circle.com)
- The Gateway API requires a minimum ~2.01 USDC fee on top of the transfer amount
- L2 chains (Base, World Chain) need ~30 seconds for L1 finality before Gateway picks up the deposit

### "Insufficient balance" when subscribing
- The user's smart wallet on Arc needs USDC
- Fund it via the Bridge page, or send USDC directly to the smart wallet address on Arc testnet
- The smart wallet address is shown in the frontend header after login

### Build errors
- Node.js >= 20 is required (check with `node --version`)
- Run `npm install` in each directory that has a `package.json`
- For TypeScript errors: `npx tsc --noEmit` in the failing directory

---

## Quick Start Checklist

```
[ ] 1. Get Circle Client Key and URL from console.circle.com
[ ] 2. Start PostgreSQL (docker compose up db -d)
[ ] 3. Create relayer/.env with DATABASE_URL + RELAYER_PRIVATE_KEY
[ ] 4. Fund relayer wallet with Arc testnet gas tokens
[ ] 5. Start relayer: cd relayer && npm run dev
[ ] 6. Create frontend/.env with VITE_CLIENT_KEY + VITE_CLIENT_URL
[ ] 7. Start frontend: cd frontend && npm run dev
[ ] 8. Open http://localhost:5173
[ ] 9. Register with passkey → Set up wallet → Fund with USDC
[ ] 10. Try the Demo page to test a subscription
```

# 🛡️ SubSafe: Crypto Subscriptions on BOTChain

**Netflix, but you pay monthly in USDT.** Approve a spending cap once, get auto-charged every billing period, and cancel any time. The price is locked into the smart contract, so no merchant can raise it on you.

Built for **BOTChain** (EVM, low fees, AI + Web3). It uses BOTChain's native **USDT** stablecoin.

| | |
|---|---|
| **Chain** | BOTChain Testnet (chain ID `968`) |
| **Contract** | `TBD after deploy` |
| **USDT** | [`0x75edC9335175Fc0552D51D48439F229c10420fe3`](https://scan.bohr.life/token/0x75edC9335175Fc0552D51D48439F229c10420fe3) (6 decimals) |
| **Demo** | `TBD (Vercel)` |
| **Stack** | Solidity · Hardhat · Next.js 16 · Wagmi v3 · Viem · Tailwind v4 |

---

## The problem

Paying for subscriptions with crypto today means sending a manual transfer every month. Most people forget, and services lose customers. Card subscriptions have the opposite problem: they're easy to start and hard to stop, and prices creep up. In Nigeria, many people also can't pay for global subscriptions with their naira cards at all.

## How SubSafe works

1. **Merchant** publishes a plan: name, price in USDT, billing period.
2. **Subscriber** picks an *auto-pay cap* (e.g. 12 months), approves that much USDT, and subscribes. The first period is charged immediately.
3. **Keeper**: when a period ends, *anyone* can call `chargeMany()`: a keeper bot, the merchant, or the subscriber. The contract only pulls payment if the subscription is actually due.
4. If a wallet can't pay, the subscription becomes **Past due** and access stops. Nothing reverts, and the subscriber can hit **Pay now** to restore it.
5. **Cancel anytime.** Access continues until the end of the period already paid for.

### Safety guarantees (why it's "Safe")

- 🔒 **Price lock**: price and period are copied into each subscription at sign-up. Merchants can't change them later.
- 🧢 **Spending cap**: subscribers approve a finite USDT allowance, not unlimited.
- ⏱️ **Due-only charging**: `charge()` reverts with `NotDue` before the period ends. There's no way to double-bill.
- 🚫 **No back-charging**: if you lapse for 3 months and renew, you pay for 1 period from *now*, not 3 missed ones.
- 🛑 **Cancel = stop**: cancelled subscriptions can never be charged again.
- 🧾 **Capped protocol fee**: hard-coded max 5% (deployed at 1%).

### On-chain access gating

Merchants can gate content with a single view call:

```solidity
subsafe.hasAccess(user, planId) // true while the subscription is paid up
```

## App (3 pages)

| Page | What it does |
|---|---|
| **Explore** `/` | Netflix-style grid of plans, prices in USDT + live **₦ NGN** conversion, subscribe flow with auto-pay cap |
| **My Subscriptions** `/subscriptions` | Status, next-charge countdown, Pay now / Cancel, adjust cap, plus the **SubSafe Assistant** (spend insights, runway, low-balance warnings) |
| **Creator Studio** `/studio` | Create plans, revenue + subscriber stats, pause/resume, charge due subscribers, and the public **Keeper** panel |

No backend, no auth. The only third-party API is [open.er-api.com](https://open.er-api.com) for the live USD→NGN rate.

## Repo layout

```
contracts/          Hardhat project
  src/SubSafe.sol     ← the one contract
  src/MockUSDT.sol    test-only token
  test/               13 tests
  scripts/deploy.js   deploys + writes address/ABI into web/src/lib/contract.ts
  scripts/seed.js     publishes demo plans
  scripts/keeper.js   auto-charge bot (run once or in a loop)
web/                Next.js 16 + Wagmi v3 + Tailwind v4
  src/app/            page.tsx, subscriptions/, studio/
  src/lib/            chain, wagmi config, hooks, generated contract.ts
```

## Run it

```bash
# 1. Contracts
cd contracts
npm install
npm test                     # 13 passing
cp .env.example .env         # add PRIVATE_KEY (wallet with a little tBOT for gas)
npm run deploy:botchain      # deploys SubSafe and auto-updates the frontend
# put the printed address into .env as SUBSAFE_ADDRESS, then:
npm run seed                 # optional demo plans
npm run keeper               # charge everything due (KEEPER_LOOP=60 to run forever)

# 2. Frontend
cd ../web
npm install
npm run dev                  # http://localhost:3000
```

## Contract API

| Function | Who | Purpose |
|---|---|---|
| `createPlan(name, metadata, price, period)` | merchant | publish a plan |
| `updatePlan(planId, active, metadata)` | merchant | pause/resume, edit description |
| `subscribe(planId)` | subscriber | start + pay first period |
| `cancel(subId)` | subscriber / merchant | stop future charges |
| `charge(subId)` | anyone | charge one due sub (reverts if not due) |
| `chargeMany(subIds)` | anyone | keeper batch; failures → PastDue, never reverts |
| `hasAccess(user, planId)` | view | content gating |
| `dueSubsOfPlan(planId)` | view | what's billable now |

## Network

```
Network:  BOTChain Testnet
RPC:      https://rpc.bohr.life
Chain ID: 968
Symbol:   tBOT
Explorer: https://scan.bohr.life
```

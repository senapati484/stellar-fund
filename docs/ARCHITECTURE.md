# StellarFund — Architecture Document

## Overview
Describe StellarFund as a 3-layer system:
  1. Soroban Smart Contract (on-chain state + business logic)
  2. Frontend Application (Next.js 14, App Router)
  3. Stellar Network (Horizon API + Soroban RPC)

## System Architecture Diagram (ASCII)

Draw a clear ASCII art diagram showing:

  ┌─────────────────────────────────────────────────────────┐
  │                    User's Browser                        │
  │                                                          │
  │   Next.js 14 Frontend (Vercel)                          │
  │   ┌──────────┐  ┌──────────┐  ┌──────────┐             │
  │   │  Browse  │  │  Create  │  │ Campaign │             │
  │   │  Page /  │  │  Page    │  │  Detail  │             │
  │   └────┬─────┘  └────┬─────┘  └────┬─────┘             │
  │        └─────────────┴─────────────┘                    │
  │                       │                                  │
  │   ┌───────────────────▼────────────────────┐            │
  │   │      lib/contract-client.ts            │            │
  │   │   (FundContractClient + TxProgress)    │            │
  │   └───────────────────┬────────────────────┘            │
  │                       │                                  │
  │   ┌───────────────────▼────────────────────┐            │
  │   │      lib/stellar-helper.ts             │            │
  │   │   (StellarWalletsKit + TTLCache)       │            │
  │   └───────┬───────────────────┬────────────┘            │
  └───────────┼───────────────────┼────────────────────────-┘
              │                   │
              ▼                   ▼
  ┌─────────────────┐   ┌──────────────────────┐
  │  Soroban RPC    │   │  Horizon API         │
  │  (testnet)      │   │  (testnet)           │
  │  soroban-testnet│   │  horizon-testnet     │
  │  .stellar.org   │   │  .stellar.org        │
  └────────┬────────┘   └──────────┬───────────┘
           │                       │
           └───────────┬───────────┘
                       │
                       ▼
          ┌────────────────────────┐
          │   stellar_fund         │
          │   Soroban Contract     │
          │   (Testnet)            │
          │                        │
          │  campaigns: Map        │
          │  donations: Map        │
          └────────────────────────┘

## Data Flow Diagrams

### Flow 1: Create Campaign
  User fills form → CreateCampaignForm validates →
  FundContractClient.createCampaign() →
  TxProgress: building → signing (WalletsKit modal) →
  submitting (Soroban RPC) → confirming (poll) → success
  Contract stores Campaign struct on-chain
  Frontend caches campaigns list (TTL 15s)

### Flow 2: Donate to Campaign
  User enters amount → DonationForm validates →
  Step A: stellar.sendPayment() → XLM transfer via Horizon
  Step B: FundContractClient.recordDonation() → contract records donation
  Campaign.raised incremented on-chain
  Balance cache invalidated

### Flow 3: Withdraw Funds
  Owner clicks Withdraw → fundClient.withdraw() →
  Contract verifies owner auth → sets withdrawn=true →
  Frontend shows success + explorer link
  NOTE: Actual fund transfer is handled by the XLM already in owner wallet

## Smart Contract Design

### Storage Architecture
  DataKey::CampaignCount         — u32 counter
  DataKey::Campaign(id)          — Campaign struct per id
  DataKey::Donations(campaign_id)— Vec<Donation> per campaign
  DataKey::UserCampaigns(owner)  — Vec<u32> campaign ids per user

### Authentication Model
  create_campaign: owner.require_auth()
  donate: donor.require_auth()
  withdraw: campaign.owner.require_auth() (loaded from storage)
  read functions: no auth required (public)

### Event Emission
  Every write function emits a contract event for real-time tracking:
  create_campaign → ("campaign_created", id, owner, goal)
  donate         → ("donation", campaign_id, donor, amount)
  withdraw       → ("withdrawal", campaign_id, owner, raised)

## Frontend Architecture

### State Management
  No external state library. React useState + useEffect per page.
  Global state: publicKey + isConnected passed as props down component tree.
  Cache: TTLCache in stellar-helper.ts (in-memory, survives page re-renders).

### Caching Strategy
  | Data | TTL | Cache Key | Invalidated by |
  |---|---|---|---|
  | XLM Balance | 30s | balance:{key} | Any sendPayment |
  | All campaigns | 15s | campaigns:all | createCampaign |
  | Campaign donations | 20s | donations:{id} | recordDonation |

### Component Architecture
  ui.tsx — Primitive components (no business logic)
  CampaignCard — Display only, no data fetching
  DonationForm — Owns donation flow state
  CreateCampaignForm — Owns creation flow with multi-step
  UserOnboardingBanner — Drives user acquisition
  Navbar — Global nav, wallet connection

### Mobile Responsiveness Strategy
  Breakpoints: 375px (base), sm=640px, md=768px, lg=1024px
  Mobile: single column, bottom tab nav, large touch targets (44px min)
  Desktop: multi-column grid, top nav with links

## API Integrations

### Stellar Horizon (REST)
  Base: https://horizon-testnet.stellar.org
  Used for: account balance, payment submission, tx history
  Rate limit: 100 req/s (well within app's usage)

### Soroban RPC (JSON-RPC)
  Base: https://soroban-testnet.stellar.org
  Used for: contract simulation, transaction submission, tx status polling
  Auth: none required for testnet

### StellarWalletsKit
  Version: @creit.tech/stellar-wallets-kit
  Modules: allowAllModules() — supports Freighter, xBull, Albedo, Rabet, Lobstr, Hana, WalletConnect
  Signing: kit.signTransaction(xdr, { networkPassphrase })

## Security Considerations

### Smart Contract
  All state-changing functions require auth
  No admin key — campaigns are fully decentralized
  Withdrawal can only be called by the campaign owner (verified on-chain)
  No re-entrancy possible (Soroban execution model)

### Frontend
  No private keys stored anywhere
  All signing happens inside the wallet extension
  Contract IDs stored in env vars (public, that's fine for testnet)
  No user PII stored in the app (only wallet addresses)

## Deployment Architecture

  GitHub repo → push to main →
  GitHub Actions CI (test + build) →
  Vercel auto-deploy (triggered by CI pass) →
  Live at https://stellar-fund.vercel.app

## Known Limitations (v1.0)

  - XLM transfer and contract donation recording are two separate transactions
    (not atomic). A failed recordDonation after successful payment would
    result in a sent payment with no on-chain record.
  - No on-chain XLM escrow. Campaign owner can access donated XLM immediately.
  - No refund mechanism if campaign doesn't reach goal.

## Planned Improvements (v1.1 — based on user feedback)
  [FILL IN after collecting feedback — see README improvement section]

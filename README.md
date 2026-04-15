# StellarFund — On-Chain Crowdfunding on Stellar

[![CI](https://github.com/senapati484/stellar-fund/actions/workflows/ci.yml/badge.svg)](https://github.com/senapati484/stellar-fund/actions/workflows/ci.yml)
[![Deploy](https://img.shields.io/badge/deploy-vercel-brightgreen)](https://stellar-fund.vercel.app)
[![Stellar Testnet](https://img.shields.io/badge/network-testnet-blue)](https://stellar.expert/explorer/testnet)

> Create campaigns, accept XLM donations, and withdraw funds — entirely
> on Soroban smart contracts. Built for the Stellar Builder Bootcamp Level 5.

## Live Demo
**URL:** [FILL IN — Vercel URL]
**Demo Video:** [FILL IN — YouTube or Loom, 90-second walkthrough]

## Level 5 Requirements Met
| Requirement | Status | Details |
|---|---|---|
| MVP fully functional | ✅ | Create, browse, donate, withdraw |
| 5+ real testnet users | ⏳ | See "Verified Users" section |
| Google Form onboarding | ⏳ | [link to form] |
| User feedback Excel | ⏳ | [user-feedback.xlsx](./user-feedback.xlsx) |
| Feedback iteration documented | ⏳ | See "Improvements" section |
| Architecture document | ✅ | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| 10+ meaningful commits | ⏳ | See git log (currently 1 commit) |
| Demo video | ⏳ | [link above] |

## Screenshots
### App — Browse Page
<!-- Screenshot: home page with 3 campaigns visible -->

### Campaign Detail + Donation
<!-- Screenshot: campaign page showing funding progress + donation form -->

### Mobile View (375px)
<!-- Screenshot: mobile view showing bottom nav + campaign cards -->

## Verified Testnet Users
These wallet addresses have interacted with the contract on Stellar testnet.
Verify each at: https://stellar.expert/explorer/testnet/account/[ADDRESS]

| # | Wallet Address | Action | Explorer |
|---|---|---|---|
| 1 | [FILL IN] | Created/Donated | [link] |
| 2 | [FILL IN] | Created/Donated | [link] |
| 3 | [FILL IN] | Created/Donated | [link] |
| 4 | [FILL IN] | Created/Donated | [link] |
| 5 | [FILL IN] | Created/Donated | [link] |

**User Onboarding Form:** [FILL IN — Google Form link]
**Feedback Spreadsheet:** [user-feedback.xlsx](./user-feedback.xlsx)

## User Feedback Summary
After collecting 5+ responses, summarize:
| Rating | Count |
|---|---|
| 5 ⭐ | N |
| 4 ⭐ | N |
...
**Most requested improvement:** [quote top feedback]

## Improvements Made Based on Feedback (v1.1)
Document 1 iteration completed after user feedback:

Example:
> **Feedback:** "It's hard to find campaigns I donated to."
> **Improvement:** Added a "My Donations" section to the Dashboard page
> showing all campaigns the user has donated to.
> **Commit:** [git commit hash and link]

[FILL IN with your actual feedback + improvement + commit link]

## Tech Stack
| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.3 (App Router, TypeScript) |
| Styling | Tailwind CSS 4, mobile-first |
| Wallet | StellarWalletsKit 2.1.0 (allowAllModules) |
| Blockchain | Stellar SDK 13.3.0 + Soroban RPC |
| Smart Contract | Rust, Soroban SDK |
| Testing | Vitest 4.1.4 + cargo test |
| CI/CD | GitHub Actions + Vercel |

## Architecture
Full architecture document: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

Key design decisions:
1. Donations are two-step: XLM transfer (Horizon) + record (Soroban)
2. Campaign state is fully on-chain — no database
3. TTL cache prevents hammering Horizon on every render
4. Multi-step form reduces mobile abandonment rate

## Smart Contract
**Contract ID:** [FILL IN — run `./scripts/deploy.sh` to deploy]
**Network:** Stellar Testnet
**Explorer:** https://stellar.expert/explorer/testnet/contract/[FILL IN]

| Function | Auth | Description |
|---|---|---|
| create_campaign | owner | Creates campaign on-chain |
| donate | donor | Records donation + amount |
| withdraw | owner | Marks campaign withdrawn |
| update_campaign_status | none | Checks deadline, deactivates if expired |
| get_campaign | none | Returns single campaign |
| get_all_campaigns | none | Returns all campaigns |
| get_active_campaigns | none | Returns only active campaigns |
| get_user_campaigns | owner | Returns campaigns for specific owner |
| get_donations | none | Returns donations for campaign |
| get_campaign_count | none | Returns total campaign count |

**Sample transaction hash:** [FILL IN from deploy.sh output]

## Setup & Installation
### Prerequisites
Node.js 20+ · Rust + Cargo · Stellar CLI · Freighter wallet

### Run Locally
```bash
git clone https://github.com/senapati484/stellar-fund.git
cd stellar-fund
npm install
cp .env.local.example .env.local
# Fill NEXT_PUBLIC_CONTRACT_ID, NEXT_PUBLIC_GOOGLE_FORM_URL
npm run dev
```

### Deploy Contract
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh   # outputs contract ID to .env.local
```

### Run Tests
```bash
npm test              # 5 Vitest tests
cargo test --manifest-path contracts/stellar_fund/Cargo.toml  # 5 Rust tests
```

## Wallet Support
Freighter · xBull · Albedo · Rabet · Lobstr · Hana · WalletConnect

## Git History
```bash
3bbb751 Initial commit from Create Next App
```

⚠️ **Note:** Level 5 requires 10+ meaningful commits. Currently showing 1 commit.
Please make additional commits for:
- Contract implementation
- Frontend components
- Testing setup
- Documentation
- Bug fixes and improvements

## Demo Video Script (90 seconds)
[0:00–0:10] Open live URL, show home page with 3 campaigns
[0:10–0:20] Click Connect Wallet → show StellarWalletsKit modal
[0:20–0:30] Connect → show balance + onboarding banner
[0:30–0:50] Create a campaign — fill form (3 steps) → submit → TxProgressStepper
[0:50–1:05] Browse to another campaign → Donate 1 XLM → show donation confirmed
[1:05–1:20] Show dashboard → campaigns + raised amount → click Withdraw
[1:20–1:30] Show Activity + Explorer link for the withdrawal tx

## Next Steps for Level 5 Submission
1. **Deploy contract** — Run `./scripts/deploy.sh` to get contract ID
2. **Deploy frontend** — Connect Vercel repo, deploy to production
3. **Get 5 testnet users** — Share Google Form link, collect wallet addresses
4. **Record demo video** — 90-second walkthrough following script above
5. **Collect feedback** — Export Google Form responses to user-feedback.xlsx
6. **Make improvements** — Implement 1 feature based on feedback
7. **Increase commits** — Ensure 10+ meaningful git commits
8. **Fill placeholders** — Update all [FILL IN] sections in this README

#!/bin/bash
set -e
echo "🚀 StellarFund — Deploying to Stellar Testnet"

if ! command -v stellar &>/dev/null; then
  echo "❌ Stellar CLI not found. Install: https://developers.stellar.org/docs/tools/cli"
  exit 1
fi

# Check if deployer key already exists before generating (avoid re-prompting/wallet spawns)
if stellar keys address deployer &>/dev/null; then
  DEPLOYER=$(stellar keys address deployer)
  echo "✓ Deployer key found: $DEPLOYER"
else
  echo "Generating new deployer key..."
  stellar keys generate --global deployer --network testnet
  DEPLOYER=$(stellar keys address deployer)
fi
echo "Deployer: $DEPLOYER"
curl -s "https://friendbot.stellar.org?addr=$DEPLOYER" > /dev/null
echo "✓ Funded via Friendbot"

# Build with stellar CLI (includes wasm-opt optimization)
stellar contract build --manifest-path contracts/stellar_fund/Cargo.toml --out-dir target
echo "✓ Contract built"

CONTRACT_ID=$(stellar contract deploy \
  --wasm target/stellar_fund.wasm \
  --source deployer --network testnet)
echo "✓ Contract deployed: $CONTRACT_ID"

echo "Seeding sample campaigns..."

TX1=$(stellar contract invoke --id $CONTRACT_ID \
  --source deployer --network testnet \
  -- create_campaign \
  --owner $DEPLOYER \
  --title "Open Source Stellar Wallet" \
  --description "Building a simple mobile wallet for Stellar testnet users with multi-asset support." \
  --goal 100000000000 \
  --duration_days 30)
echo "✓ Campaign 1 created, tx: $TX1"

TX2=$(stellar contract invoke --id $CONTRACT_ID \
  --source deployer --network testnet \
  -- create_campaign \
  --owner $DEPLOYER \
  --title "Stellar Developer Bootcamp Scholarship" \
  --description "Fund 10 developers to complete the Stellar bootcamp. Every XLM counts." \
  --goal 500000000000 \
  --duration_days 60)
echo "✓ Campaign 2 created, tx: $TX2"

TX3=$(stellar contract invoke --id $CONTRACT_ID \
  --source deployer --network testnet \
  -- create_campaign \
  --owner $DEPLOYER \
  --title "Testnet Faucet for New Builders" \
  --description "A public faucet that distributes testnet XLM to new Stellar developers." \
  --goal 50000000000 \
  --duration_days 14)
echo "✓ Campaign 3 created, tx: $TX3"

cat > .env.local << EOF
NEXT_PUBLIC_CONTRACT_ID=$CONTRACT_ID
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_DEPLOYER=$DEPLOYER
NEXT_PUBLIC_GOOGLE_FORM_URL=https://forms.gle/REPLACE_WITH_YOUR_FORM
EOF
echo "✓ .env.local written"

echo ""
echo "══════════════════════════════════════════"
echo "✅ StellarFund Deployment Complete"
echo "══════════════════════════════════════════"
echo "Contract ID:  $CONTRACT_ID"
echo "Campaign 1 tx: $TX1"
echo "Campaign 2 tx: $TX2"
echo "Campaign 3 tx: $TX3"
echo ""
echo "Explorer: https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"
echo ""
echo "⚠  Update NEXT_PUBLIC_GOOGLE_FORM_URL in .env.local after creating your Google Form"

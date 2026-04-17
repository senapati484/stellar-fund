# Stellar Fund - Error Report

Created: 2026-04-17

## Summary

The Stellar Fund application (Soroban smart contract crowdfunding dapp) has multiple issues affecting campaign creation, donation functionality, and data display.

---

## Issue 1: Transaction Confirmation - SDK XDR Parsing Bug

**Status:** FIXED (using Horizon API directly)

**Original Error:** `Bad union switch: 4` - SDK's `getTransaction()` cannot parse Soroban transaction results

**Solution Applied:** Replaced `this.server.getTransaction(hash)` with direct Horizon API polling via `fetch('https://horizon-testnet.stellar.org/transactions/{hash}')`

**Location:** `lib/contract-client.ts:162-195`

---

## Issue 2: Horizon API Polling Not Detecting Success Properly

**Symptom:** Transaction confirmed on-chain (verified via Horizon API) but confirmation loop still times out

**Expected:** When `txData.successful === true`, the loop should return success

**Actual:** The confirmation still fails

**Investigation Needed:** The Horizon API response shows `"successful": true` for transaction `754bb063b00fc16600ecd4e07306e0bea0ffc62f68dbe9cb7e3754bbf644c620` but the app still shows timeout

---

## Issue 3: Campaign Owner Field Truncated

**Symptom:** Campaign ID 8, 9 show owner as "GD2W7IXU" (8 chars) instead of full 56-char address

**Expected:** Full address like `GD2W7IXUIQTDZXF3OAXOO7BTEEN6XS4RY7CFRSU543U2Y5C5DZ33ZTK5`

**Location:** `lib/contract-client.ts:636` - parseCampaignResponse logging

**Console Output:**
```
parseCampaignResponse[8]: 8 owner: GD2W7IXU
parseCampaignResponse[9]: 9 owner: GD2W7IXU
```

**Possible Cause:** The `decodeScVal` function for `scvAddress` type may not be extracting raw bytes correctly from parsed XDR structure

---

## Issue 4: Donation Functionality Not Working

**Symptom:** User cannot donate to campaigns - no error but donation doesn't register

**Location:** `lib/contract-client.ts:316-375` - `recordDonation` function

**Related Functions:**
- Uses `this.server.sendTransaction()` to broadcast
- Uses same `submitTx()` for confirmation
- Donation data stored in contract via `donate` function

---

## Issue 5: Campaign Amount/Goal Display Incorrect

**Symptom:** Campaign shows wrong goal amount (e.g., 0 instead of actual value)

**Location:** Campaign parsing in `lib/contract-client.ts:739-751`

**Code:**
```typescript
return {
  id: fields.id ?? fields.id === 0 ? Number(fields.id) : 0,
  owner: fields.owner ? String(fields.owner) : "",
  // Convert from stroops (10^7) to XLM for display
  goal: (fields.goal ?? 0) / 10_000_000,
  raised: (fields.raised ?? 0) / 10_000_000,
  // ...
};
```

**Possible Cause:** Field names mismatch between contract and parsing code

---

## Issue 6: get_all_campaigns Returns More Campaigns Than Expected

**Symptom:** `get_all_campaigns` returns 10 campaigns when only ~5 were explicitly created

**Console Output:**
```
parseCampaignResponse: vec length: 10
parseCampaignResponse[0]: 0 owner: GBIF3PP7
parseCampaignResponse[8]: 8 owner: GD2W7IXU
parseCampaignResponse[9]: 9 owner: GD2W7IXU
```

**Possible Cause:** Contract may be returning uninitialized/default campaigns

---

## Code Sections Needing Investigation

### 1. Transaction Confirmation Loop
```typescript
// lib/contract-client.ts:162-195
// Uses Horizon API - needs verification that response is being processed correctly
const response = await fetch(`${horizonUrl}/transactions/${hash}?c=0`);
const txData = await response.json();

if (txData.successful === true) {
  // Should return success
} else if (txData.successful === false) {
  // Should throw error
}
// If pending, continues loop
```

### 2. Address Decoding for Campaign Owner
```typescript
// lib/contract-client.ts:685-703 - decodeScVal for scvAddress
case "scvAddress":
  const addrInner = val._value;
  if (addrInner?.switch?.name === "scAddressTypeAccount") {
    const rawBytes = addrInner._value?._value;
    if (Buffer.isBuffer(rawBytes) && rawBytes.length === 32) {
      return StrKey.encodeEd25519PublicKey(rawBytes);
    }
  }
```

### 3. Campaign Parsing
```typescript
// lib/contract-client.ts:709-755 - parseMapToCampaign
const entries = item._value || [];
for (const entry of entries) {
  const keyVal = entry._attributes?.key;
  const valVal = entry._attributes?.val;
  // Decodes based on type, stores in fields{}
}
```

---

## Relevant Code Files

| File | Purpose |
|------|---------|
| `lib/contract-client.ts` | Main contract interaction - submitTx, createCampaign, recordDonation |
| `components/CampaignProvider.tsx` | React context for campaign state management |
| `components/CreateCampaignForm.tsx` | Form for creating new campaigns |
| `app/campaign/[id]/page.tsx` | Campaign detail page |
| `contracts/stellar_fund/src/lib.rs` | Soroban smart contract (Rust) |

---

## Package Versions

```json
{
  "@stellar/stellar-sdk": "^13.3.0",
  "@stellar/freighter-api": "^6.0.0",
  "@creit.tech/stellar-wallets-kit": "^2.1.0",
  "next": "16.2.3"
}
```

---

## Questions for Further Investigation

1. Is the contract deployed with correct WASM and correct network?
2. Does `create_campaign` function actually return the campaign ID as u32?
3. Is there a mismatch between contract function signatures and SDK type definitions?
4. What are the actual field names in the Campaign struct in the contract?
5. Why does the Horizon API return successful for confirmed transactions but the loop doesn't detect it?
# Stellar Fund - Error Report

## Summary

The Stellar Fund application (Soroban smart contract crowdfunding dapp) has multiple unresolved issues affecting campaign creation, donation functionality, and data display.

---

## Issue 1: Transaction Confirmation Fails with XDR Parse Error

**Error:** `Bad union switch: 4` - SDK's `getTransaction()` cannot parse Soroban transaction results

**Location:** `lib/contract-client.ts:194` (submitTx function)

**Description:** When polling for transaction confirmation using `this.server.getTransaction(hash)`, the SDK throws an XDR parsing error because it cannot handle the Soroban-specific transaction result envelope. After 5 failures, the code treats the transaction as submitted but cannot confirm it.

**Code Section:**
```typescript
// lib/contract-client.ts line 168-209
while (attempts < maxAttempts) {
  await new Promise((resolve) => setTimeout(resolve, pollInterval));
  try {
    const txResult = await this.server.getTransaction(hash);  // <-- FAILS HERE
    // ...
  } catch (err) {
    const isXdrParsingError = err instanceof TypeError && String(err).includes("union switch");
    if (isXdrParsingError) {
      xdrErrorCount++;
      console.warn(`[ContractClient] SDK XDR parse error (${xdrErrorCount}/${maxXdrErrors}):`, err.message);
      if (xdrErrorCount >= maxXdrErrors) {
        // Treat as submitted but can't confirm
      }
    }
  }
}
```

**Console Error:**
```
[ContractClient] SDK XDR parse error (1/5): Bad union switch: 4
```

---

## Issue 2: Campaign Owner Field Empty When Parsed

**Symptom:** Campaign ID 8, 9 show owner as "GD2W7IXU" (truncated) instead of full address

**Location:** `lib/contract-client.ts:795` (parseCampaignResponse function)

**Description:** When parsing campaign data from `get_all_campaigns`, the owner address appears truncated or empty in some cases.

**Code Section:**
```typescript
// lib/contract-client.ts line 795
Desktop_Dev_stellar_stellar-fund_0p14ofd._.js:795 [ContractClient] parseCampaignResponse[8]: 8 owner: GD2W7IXU
Desktop_Dev_stellar_stellar-fund_0p14ofd._.js:795 [ContractClient] parseCampaignResponse[9]: 9 owner: GD2W7IXU
// Expected: Full 56-character address like GD2W7IXUIQTDZXF3OAXOO7BTEEN6XS4RY7CFRSU543U2Y5C5DZ33ZTK5
```

---

## Issue 3: Donation Functionality Not Working

**Symptom:** User cannot donate to campaigns - no error but donation doesn't register

**Location:** Likely in `lib/contract-client.ts` - `donateToCampaign` function

**Related:** Transaction submission works but confirmation fails, so donations may be submitted but not confirmed on-chain.

---

## Issue 4: Campaign Amount/Goal Display Incorrect

**Symptom:** Campaign shows wrong goal amount (e.g., 0 instead of actual value)

**Location:** `components/CampaignProvider.tsx` or parsing of campaign data

**Description:** The goalXlm value appears incorrect when campaigns are displayed. The simulation returns `scvU32` with value `3` or `8` which may be misinterpretation.

---

## Issue 5: Simulation Returns Unexpected Result Type

**Log:**
```
contract-client.ts:295 [ContractClient] createResult: {
  "_switch": { "name": "scvU32", "value": 3 },
  "_arm": "u32",
  "_value": 8
}
contract-client.ts:305 [ContractClient] Campaign ID from simulation: 8
```

**Location:** `lib/contract-client.ts:290-310`

**Description:** The simulation result for `create_campaign` returns a u32 (campaign ID) but the code treats it correctly. However, this pattern suggests the contract's return type may not be properly defined in the SDK.

---

## Issue 6: Transaction Status "NOT_FOUND" Despite Successful Broadcast

**Log:**
```
[ContractClient] sendTransaction result: {"status":"PENDING","hash":"...","latestLedger":2084273}
[ContractClient] TX status: NOT_FOUND attempt: 1
[ContractClient] Transaction not found yet, waiting...
```

**Location:** `lib/contract-client.ts:168` (getTransaction polling)

**Description:** Transaction is successfully broadcast (PENDING) but `getTransaction` returns NOT_FOUND. This happens even with valid transactions because of the XDR parsing bug in SDK v13.

---

## Root Cause Analysis

### Primary Issue: Stellar SDK v13 Bug

The `@stellar/stellar-sdk` v13.3.0 has a known bug where `getTransaction()` fails to parse Soroban transaction results. The error `"Bad union switch: 4"` occurs because:

1. Soroban transactions use a different result envelope than classic Stellar transactions
2. The SDK's XDR parsing code encounters an unexpected union switch value (4 instead of expected 0-3)
3. This affects every poll, causing all transactions to appear to fail

### Evidence from Logs

- Transaction hash `0cf47758e788fb9babb329991a4aadda41024b20246af63f6ae058ec8630bce7` was broadcast and returned PENDING
- Campaign ID 8 was created successfully (visible in subsequent `get_all_campaigns` calls)
- But confirmation polling failed with XDR parse errors

---

## Relevant Code Files

| File | Purpose |
|------|---------|
| `lib/contract-client.ts` | Main contract interaction - submitTx, createCampaign, donateToCampaign |
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

## Suggested Fix Approach

1. **Replace `getTransaction()` polling** with Horizon API direct fetch to avoid SDK's broken XDR parsing
2. **Check contract return type** - verify `create_campaign` returns correct type
3. **Add campaign data validation** to handle malformed owner addresses
4. **Test donation flow end-to-end** to identify where it breaks
5. **Verify Soroban RPC endpoint** - ensure using correct testnet URL

---

## Questions for Further Investigation

1. Is the contract deployed with correct WASM and correct network?
2. Does `create_campaign` function actually return the campaign ID as u32?
3. Is there a mismatch between contract function signatures and SDK type definitions?
4. Why does `get_all_campaigns` return 10 campaigns when only some were explicitly created?
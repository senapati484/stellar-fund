import {
  xdr,
  Contract,
  TransactionBuilder,
  BASE_FEE,
  Networks,
  ScInt,
  Address,
  rpc,
  StrKey,
  Account,
  Keypair,
  SorobanDataBuilder,
  TimeoutInfinite,
  XdrLargeInt,
} from "@stellar/stellar-sdk";
import { assembleTransaction, Api } from "@stellar/stellar-sdk/rpc";

// Mock account for simulations
const createMockAccount = () =>
  new Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");

// Normalize address to proper format
function normalizeAddress(address: string): string {
  if (address.startsWith("G") && address.length === 56) {
    return address;
  }
  try {
    const rawKey = Buffer.from(address, "hex");
    return StrKey.encodeEd25519PublicKey(rawKey);
  } catch {
    return address;
  }
}

import { stellar } from "./stellar-helper";

export type TxProgress =
  | { stage: "idle" }
  | { stage: "building"; message: "Building transaction…" }
  | { stage: "signing"; message: "Waiting for wallet signature…" }
  | { stage: "submitting"; message: "Broadcasting to network…" }
  | { stage: "confirming"; message: "Confirming on-chain…" }
  | { stage: "success"; message: "Confirmed!"; hash: string }
  | { stage: "error"; message: string; errorType: string };

export interface Campaign {
  id: number;
  owner: string;
  title: string;
  description: string;
  goal: number;
  raised: number;
  deadline: number;
  withdrawn: boolean;
  active: boolean;
  createdAt: number;
}

export interface Donation {
  campaignId: number;
  donor: string;
  amount: number;
  message: string;
  timestamp: number;
}

class TTLCache<T> {
  private cache = new Map<string, { data: T; expiresAt: number }>();

  set(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateAll(): void {
    this.cache.clear();
  }
}

class FundContractClient {
  private contractId: string;
  private server: rpc.Server;
  private cache = new TTLCache<any>();
  private onProgress?: (progress: TxProgress) => void;

  constructor(onProgress?: (progress: TxProgress) => void) {
    this.contractId = process.env.NEXT_PUBLIC_CONTRACT_ID || "";
    if (!this.contractId) {
      throw new Error("NEXT_PUBLIC_CONTRACT_ID not set");
    }

    this.server = new rpc.Server("https://soroban-testnet.stellar.org", {
      allowHttp: true,
    });
    this.onProgress = onProgress;
  }

  private updateProgress(progress: TxProgress): void {
    if (this.onProgress) {
      this.onProgress(progress);
    }
  }

  private async submitTx(ownerKey: string, xdr: string, simResponse?: any): Promise<string> {
    try {
      console.log('[ContractClient] submitTx called with ownerKey:', ownerKey);
      console.log('[ContractClient] XDR length:', xdr.length);

      this.updateProgress({
        stage: "signing",
        message: "Waiting for wallet signature…",
      });

      console.log('[ContractClient] Requesting wallet signature...');
      const { signedXdr } = await stellar.sign({
        xdr,
        publicKeys: [ownerKey],
        network: Networks.TESTNET,
      });
      console.log('[ContractClient] Wallet signature received, signedXdr length:', signedXdr.length);

      this.updateProgress({
        stage: "submitting",
        message: "Broadcasting to network…",
      });

      console.log('[ContractClient] Submitting transaction to network...');
      // Parse the signed XDR to get the transaction
      const txToSend = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET) as any;
      console.log('[ContractClient] TX to send, source:', txToSend._source?._accountId?._value);
      const result = await this.server.sendTransaction(txToSend);
      console.log('[ContractClient] sendTransaction result:', JSON.stringify(result));

      this.updateProgress({
        stage: "confirming",
        message: "Confirming on-chain…",
      });

      const hash = result.hash;
      console.log('[ContractClient] Transaction submitted, hash:', hash);
      let attempts = 0;
      const maxAttempts = 90; // 90 * 2000ms = 180 seconds (3 minutes)
      const pollInterval = 2000;

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));

        try {
          const txResult = await this.server.getTransaction(hash);
          console.log('[ContractClient] TX status:', txResult.status, 'attempt:', attempts + 1);

          if (txResult.status === "SUCCESS") {
            this.updateProgress({
              stage: "success",
              message: "Confirmed!",
              hash,
            });
            console.log('[ContractClient] Transaction confirmed successfully');
            return hash;
          } else if (txResult.status === "FAILED") {
            const errorMsg = `Transaction failed: ${txResult.resultXdr}`;
            console.error('[ContractClient] Transaction failed:', errorMsg);
            throw new Error(errorMsg);
          } else if (txResult.status === "NOT_FOUND") {
            console.log('[ContractClient] Transaction not found yet, waiting...');
          }
          // PENDING - continue polling
        } catch (err) {
          console.error('[ContractClient] Error polling transaction:', err);
          throw err;
        }

        attempts++;
      }

      console.error('[ContractClient] Transaction confirmation timed out after', maxAttempts * pollInterval / 1000, 'seconds');
      throw new Error("Transaction confirmation timeout - the network may be slow. Please check the explorer for your transaction status.");
    } catch (error) {
      console.error('[ContractClient] submitTx error:', error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      
      let userMessage = errorMessage;
      if (errorMessage.includes("contract")) {
        userMessage = "Smart contract not found. Is it deployed?";
      } else if (errorMessage.includes("auth")) {
        userMessage = "Authentication required. Please connect your wallet.";
      } else if (errorMessage.includes("balance")) {
        userMessage = "Insufficient XLM balance for transaction.";
      } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        userMessage = "Network error. Please check your connection.";
      }
      
      this.updateProgress({
        stage: "error",
        message: userMessage,
        errorType: error instanceof Error ? error.constructor.name : "Error",
      });
      throw new Error(userMessage);
    }
  }

  async createCampaign(params: {
    ownerKey: string;
    title: string;
    description: string;
    goalXlm: number;
    durationDays: number;
  }): Promise<string> {
    this.updateProgress({
      stage: "building",
      message: "Building transaction…",
    });

    try {
      const normalizedOwner = normalizeAddress(params.ownerKey);
      const contract = new Contract(this.contractId);
      const goalStroops = Math.round(params.goalXlm * 10_000_000);

      console.log('[ContractClient] Creating campaign with goal:', goalStroops, 'stroops');

      // Step 1: Get account once for both simulation and assembly
      const account = await this.server.getAccount(normalizedOwner);

      // Step 2: Build transaction for simulation
      const txForSim = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          contract.call(
            "create_campaign",
            new Address(normalizedOwner).toScVal(),
            xdr.ScVal.scvString(params.title),
            xdr.ScVal.scvString(params.description),
            new XdrLargeInt("i128", goalStroops).toI128(),
            xdr.ScVal.scvU32(params.durationDays),
          ),
        )
        .setTimeout(300)
        .build();

      // Step 3: Simulate to get proper fee and soroban data
      console.log('[ContractClient] Simulating transaction...');
      const simResponse = await this.server.simulateTransaction(txForSim) as any;
      console.log('[ContractClient] Simulation minResourceFee:', simResponse.minResourceFee);

      // Check for simulation errors using SDK type guard
      if (Api.isSimulationError(simResponse)) {
        const errorMsg = simResponse.error || "Unknown simulation error";
        console.error('[ContractClient] Simulation error:', errorMsg);
        throw new Error(`Simulation failed: ${errorMsg}`);
      }

      // Step 4: Assemble using txForSim (not rebuilding)
      const minFee = simResponse.minResourceFee || BASE_FEE;
      console.log('[ContractClient] Assembling final tx with minFee:', minFee);

      // Clone txForSim with proper fee then assemble
      const txForAssembly = new TransactionBuilder(account, {
        fee: String(minFee),
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          contract.call(
            "create_campaign",
            new Address(normalizedOwner).toScVal(),
            xdr.ScVal.scvString(params.title),
            xdr.ScVal.scvString(params.description),
            new XdrLargeInt("i128", goalStroops).toI128(),
            xdr.ScVal.scvU32(params.durationDays),
          ),
        )
        .setTimeout(300)
        .build();

      const assembledTxBuilder = assembleTransaction(txForAssembly, simResponse);
      const finalTx = assembledTxBuilder.build();
      const txXdr = finalTx.toXDR();

      console.log('[ContractClient] Submitting transaction...');
      return this.submitTx(params.ownerKey, txXdr, simResponse);
    } catch (error) {
      throw new Error(
        `Failed to create campaign: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  async recordDonation(params: {
    donorKey: string;
    campaignId: number;
    amountXlm: number;
    message: string;
  }): Promise<string> {
    this.updateProgress({
      stage: "building",
      message: "Building transaction…",
    });

    try {
      const normalizedDonor = normalizeAddress(params.donorKey);
      const contract = new Contract(this.contractId);
      const amountStroops = Math.round(params.amountXlm * 10_000_000);

      console.log('[ContractClient] Recording donation:', amountStroops, 'stroops to campaign:', params.campaignId);

      // Step 1: Get account once for both simulation and assembly
      const account = await this.server.getAccount(normalizedDonor);

      // Step 2: Build transaction for simulation
      const txForSim = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          contract.call(
            "donate",
            new Address(normalizedDonor).toScVal(),
            xdr.ScVal.scvU32(params.campaignId),
            new XdrLargeInt("i128", amountStroops).toI128(),
            xdr.ScVal.scvString(params.message),
          ),
        )
        .setTimeout(300)
        .build();

      // Step 3: Simulate to get proper fee and soroban data
      console.log('[ContractClient] Simulating donation transaction...');
      const simResponse = await this.server.simulateTransaction(txForSim) as any;

      if (simResponse.error || simResponse.status === "error") {
        throw new Error(`Simulation failed: ${simResponse.error?.message || simResponse.error || "Unknown error"}`);
      }

      // Step 4: Build final transaction using assembleTransaction
      const minFee = simResponse.minResourceFee || BASE_FEE;

      const txForAssembly = new TransactionBuilder(account, {
        fee: String(minFee),
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          contract.call(
            "donate",
            new Address(normalizedDonor).toScVal(),
            xdr.ScVal.scvU32(params.campaignId),
            new XdrLargeInt("i128", amountStroops).toI128(),
            xdr.ScVal.scvString(params.message),
          ),
        )
        .setTimeout(300)
        .build();

      const assembledTxBuilder = assembleTransaction(txForAssembly, simResponse);
      const finalTx = assembledTxBuilder.build();
      const txXdr = finalTx.toXDR();

      return this.submitTx(params.donorKey, txXdr, simResponse);
    } catch (error) {
      throw new Error(
        `Failed to record donation: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  async withdraw(ownerKey: string, campaignId: number): Promise<string> {
    this.updateProgress({
      stage: "building",
      message: "Building transaction…",
    });

    try {
      const normalizedOwner = normalizeAddress(ownerKey);
      const contract = new Contract(this.contractId);

      console.log('[ContractClient] Withdrawing from campaign:', campaignId);

      // Step 1: Get account once for both simulation and assembly
      const account = await this.server.getAccount(normalizedOwner);

      // Step 2: Build transaction for simulation
      const txForSim = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(contract.call("withdraw", xdr.ScVal.scvU32(campaignId)))
        .setTimeout(300)
        .build();

      // Step 3: Simulate to get proper fee and soroban data
      console.log('[ContractClient] Simulating withdraw transaction...');
      const simResponse = await this.server.simulateTransaction(txForSim) as any;

      if (simResponse.error || simResponse.status === "error") {
        throw new Error(`Simulation failed: ${simResponse.error?.message || simResponse.error || "Unknown error"}`);
      }

      // Step 4: Build final transaction using assembleTransaction
      const minFee = simResponse.minResourceFee || BASE_FEE;

      const txForAssembly = new TransactionBuilder(account, {
        fee: String(minFee),
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(contract.call("withdraw", xdr.ScVal.scvU32(campaignId)))
        .setTimeout(300)
        .build();

      const assembledTxBuilder = assembleTransaction(txForAssembly, simResponse);
      const finalTx = assembledTxBuilder.build();
      const txXdr = finalTx.toXDR();

      return this.submitTx(ownerKey, txXdr, simResponse);
    } catch (error) {
      throw new Error(
        `Failed to withdraw: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  async getAllCampaigns(
    forceRefresh = false,
  ): Promise<{ campaigns: Campaign[]; cached: boolean }> {
    const cacheKey = "campaigns:all";

    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return { campaigns: cached, cached: true };
      }
    }

    try {
      console.log('[ContractClient] Calling get_all_campaigns on contract:', this.contractId);
      const contract = new Contract(this.contractId);
      const result = await this.server.simulateTransaction(
        new TransactionBuilder(createMockAccount(), {
          fee: BASE_FEE,
          networkPassphrase: Networks.TESTNET,
        })
          .addOperation(contract.call("get_all_campaigns"))
          .setTimeout(TimeoutInfinite)
          .build(),
      ) as any;
      console.log('[ContractClient] Raw simulation result:', JSON.stringify(result.result?.retval?._switch?.name));
      console.log('[ContractClient] Result has retval:', !!result.result?.retval);
      console.log('[ContractClient] Result _parsed:', result._parsed);

      const campaigns = this.parseCampaignResponse(result as any);
      console.log('[ContractClient] Parsed campaigns:', campaigns.length, campaigns);
      this.cache.set(cacheKey, campaigns, 15000);

      return { campaigns, cached: false };
    } catch (error) {
      console.error("[ContractClient] Error fetching campaigns:", error);
      return { campaigns: [], cached: false };
    }
  }

  async getActiveCampaigns(): Promise<Campaign[]> {
    try {
      const contract = new Contract(this.contractId);
      const result = await this.server.simulateTransaction(
        new TransactionBuilder(createMockAccount(), {
          fee: BASE_FEE,
          networkPassphrase: Networks.TESTNET,
        })
.addOperation(contract.call("get_active_campaigns"))
          .setTimeout(TimeoutInfinite)
          .build(),
        );

        return this.parseCampaignResponse(result as any);
    } catch (error) {
      console.error("Error fetching active campaigns:", error);
      return [];
    }
  }

  async getCampaign(id: number): Promise<Campaign> {
    try {
      const contract = new Contract(this.contractId);
      const result = await this.server.simulateTransaction(
        new TransactionBuilder(createMockAccount(), {
          fee: BASE_FEE,
          networkPassphrase: Networks.TESTNET,
        })
          .addOperation(contract.call("get_campaign", xdr.ScVal.scvU32(id)))
          .setTimeout(TimeoutInfinite)
          .build(),
      );

      const campaigns = this.parseCampaignResponse(result as any);
      if (campaigns.length === 0) {
        throw new Error(`Campaign ${id} not found`);
      }
      return campaigns[0];
    } catch (error) {
      throw new Error(
        `Failed to get campaign: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  async getUserCampaigns(ownerKey: string): Promise<Campaign[]> {
    try {
      const normalizedOwner = normalizeAddress(ownerKey);
      const contract = new Contract(this.contractId);
      const result = await this.server.simulateTransaction(
        new TransactionBuilder(createMockAccount(), {
          fee: BASE_FEE,
          networkPassphrase: Networks.TESTNET,
        })
          .addOperation(
            contract.call(
              "get_user_campaigns",
              new Address(normalizedOwner).toScVal(),
            ),
          )
          .setTimeout(TimeoutInfinite)
          .build(),
      );

      return this.parseCampaignResponse(result as any);
    } catch (error) {
      console.error("Error fetching user campaigns:", error);
      return [];
    }
  }

  async getDonations(
    campaignId: number,
    forceRefresh = false,
  ): Promise<{ donations: Donation[]; cached: boolean }> {
    const cacheKey = `donations:${campaignId}`;

    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return { donations: cached, cached: true };
      }
    }

    try {
      const contract = new Contract(this.contractId);
      const result = await this.server.simulateTransaction(
        new TransactionBuilder(createMockAccount(), {
          fee: BASE_FEE,
          networkPassphrase: Networks.TESTNET,
        })
          .addOperation(
            contract.call("get_donations", xdr.ScVal.scvU32(campaignId)),
          )
          .setTimeout(TimeoutInfinite)
          .build(),
      );

      const donations = this.parseDonationResponse(result as any);
      this.cache.set(cacheKey, donations, 20000);

      return { donations, cached: false };
    } catch (error) {
      console.error("Error fetching donations:", error);
      return { donations: [], cached: false };
    }
  }

  async getCampaignCount(): Promise<number> {
    try {
      const contract = new Contract(this.contractId);
      const result = await this.server.simulateTransaction(
        new TransactionBuilder(createMockAccount(), {
          fee: BASE_FEE,
          networkPassphrase: Networks.TESTNET,
        })
          .addOperation(contract.call("get_campaign_count"))
          .setTimeout(TimeoutInfinite)
          .build(),
      );

      const retval = (result as any).result?.retval;
      if (retval) {
        return Number(retval._value || 0);
      }
      return 0;
    } catch (error) {
      console.error("Error fetching campaign count:", error);
      return 0;
    }
  }

  private parseCampaignResponse(response: any): Campaign[] {
    try {
      const result = response.result?.retval;
      if (!result || !result._value) return [];

      const vec = Array.isArray(result._value) ? result._value : [];
      return vec
        .map((item: any) => this.parseMapToCampaign(item))
        .filter(Boolean) as Campaign[];
    } catch (error) {
      console.error("Error parsing campaigns:", error);
      return [];
    }
  }

  private decodeScVal(val: any): any {
    if (!val) return null;
    const switchVal = val._switch?.name;
    const armValue = val._arm;
    const inner = val._value;

    switch (switchVal) {
      case "scvU32":
        return Number(inner);
      case "scvU64":
        return Number(inner?._value || 0);
      case "scvI128":
        // i128 stored as { lo: u64, hi: i64 } in _value._attributes
        const attrs = inner?._attributes;
        if (attrs) {
          const lo = BigInt(attrs.lo?._value || 0);
          const hi = BigInt(attrs.hi?._value || 0);
          // Convert i128 to Number (for display purposes)
          if (hi === BigInt(0)) return Number(lo);
          // Handle negative i128
          const twosComplement = (hi << BigInt(64)) | lo;
          const threshold = BigInt(1) << BigInt(127);
          const signed = twosComplement >= threshold ? twosComplement - (BigInt(1) << BigInt(128)) : twosComplement;
          return Number(signed);
        }
        return Number(inner || 0);
      case "scvBool":
        return Boolean(inner);
      case "scvString":
      case "scvSymbol":
        // _value can be a Buffer directly or { data: Buffer }
        if (Buffer.isBuffer(inner)) {
          return inner.toString("utf8");
        }
        if (inner?.data && Buffer.isBuffer(inner.data)) {
          return inner.data.toString("utf8");
        }
        return String(inner || "");
      case "scvAddress":
        if (inner?._value) {
          // Address can be either contract or account
          const addrValue = inner._value;
          if (addrValue?._switch?.name === "scAddressTypeAccount") {
            return addrValue._value?.accountId?._value?.value || "";
          }
          if (addrValue?._switch?.name === "scAddressTypeContract") {
            return addrValue._value?.contractId?.toString("hex") || "";
          }
        }
        return "";
      default:
        return null;
    }
  }

  private parseMapToCampaign(item: any): Campaign | null {
    try {
      // The map entries are in _value as an array of { key: ScVal, val: ScVal }
      const entries = item._value || [];
      const fields: Record<string, any> = {};

      for (const entry of entries) {
        const keyVal = entry._attributes?.key;
        const valVal = entry._attributes?.val;

        if (!keyVal || !valVal) continue;

        // Decode the key symbol
        let keyName = "";
        if (keyVal._switch?.name === "scvSymbol") {
          const keyInner = keyVal._value;
          if (Buffer.isBuffer(keyInner)) {
            keyName = keyInner.toString("utf8");
          } else if (keyInner?.data) {
            keyName = Buffer.from(keyInner.data).toString("utf8");
          }
        }

        // Decode the value based on type
        const decodedVal = this.decodeScVal(valVal);
        if (keyName) {
          fields[keyName] = decodedVal;
        }
      }

      return {
        id: fields.id ?? fields.id === 0 ? Number(fields.id) : 0,
        owner: fields.owner ? String(fields.owner) : "",
        title: fields.title ? String(fields.title) : "",
        description: fields.description ? String(fields.description) : "",
        goal: fields.goal ?? 0,
        raised: fields.raised ?? 0,
        deadline: fields.deadline ?? 0,
        withdrawn: Boolean(fields.withdrawn),
        active: Boolean(fields.active),
        createdAt: fields.created_at ?? fields.createdAt ?? 0,
      };
    } catch {
      return null;
    }
  }

  private parseDonationResponse(response: any): Donation[] {
    try {
      const result = response.result?.retval;
      if (!result || !result._value) return [];

      const vec = Array.isArray(result._value) ? result._value : [];
      return vec
        .map((item: any) => this.parseMapToDonation(item))
        .filter(Boolean) as Donation[];
    } catch (error) {
      console.error("Error parsing donations:", error);
      return [];
    }
  }

  private parseMapToDonation(item: any): Donation | null {
    try {
      // The map entries are in _value as an array of { key: ScVal, val: ScVal }
      const entries = item._value || [];
      const fields: Record<string, any> = {};

      for (const entry of entries) {
        const keyVal = entry._attributes?.key;
        const valVal = entry._attributes?.val;

        if (!keyVal || !valVal) continue;

        // Decode the key symbol
        let keyName = "";
        if (keyVal._switch?.name === "scvSymbol") {
          const keyInner = keyVal._value;
          if (Buffer.isBuffer(keyInner)) {
            keyName = keyInner.toString("utf8");
          } else if (keyInner?.data) {
            keyName = Buffer.from(keyInner.data).toString("utf8");
          }
        }

        // Decode the value based on type
        const decodedVal = this.decodeScVal(valVal);
        if (keyName) {
          fields[keyName] = decodedVal;
        }
      }

      return {
        campaignId: fields.campaign_id ?? 0,
        donor: fields.donor ? String(fields.donor) : "",
        amount: fields.amount ?? 0,
        message: fields.message ? String(fields.message) : "",
        timestamp: fields.timestamp ?? 0,
      };
    } catch {
      return null;
    }
  }

  getProgressPercent(campaign: Campaign): number {
    return Math.min(100, Math.round((campaign.raised / campaign.goal) * 100));
  }

  getDaysLeft(campaign: Campaign): number {
    return Math.max(
      0,
      Math.ceil((campaign.deadline - Date.now() / 1000) / 86400),
    );
  }

  isExpired(campaign: Campaign): boolean {
    return campaign.deadline < Date.now() / 1000;
  }
}

export function createFundClient(onProgress?: (progress: TxProgress) => void) {
  return new FundContractClient(onProgress);
}

// Export the client class for direct use
export { FundContractClient };

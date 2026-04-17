import {
  Soroban,
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
} from "@stellar/stellar-sdk";

// Mock account for simulations
const createMockAccount = () =>
  new Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");

// Convert address to proper format for Soroban
// If already a G... address, return as-is. If hex, convert to G... address.
function normalizeAddress(address: string): string {
  // If it's already a G... address, return it directly
  if (address.startsWith('G') && address.length === 56) {
    return address;
  }
  // Otherwise assume it's hex and convert
  try {
    const rawKey = Buffer.from(address, "hex");
    return StrKey.encodeEd25519PublicKey(rawKey);
  } catch {
    // If conversion fails, return original (might already be correct format)
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
  capDonationsAtGoal?: boolean;
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

export class FundContractClient {
  private contractId: string;
  private server: rpc.Server;
  private cache = new TTLCache<any>();
  private onProgress?: (progress: TxProgress) => void;

  constructor(onProgress?: (progress: TxProgress) => void) {
    this.contractId = process.env.NEXT_PUBLIC_CONTRACT_ID || "";
    console.log('FundContractClient initialized with contract ID:', this.contractId);
    if (!this.contractId) {
      throw new Error("NEXT_PUBLIC_CONTRACT_ID not set");
    }

    // Try alternative RPC endpoint for better testnet connectivity
    this.server = new rpc.Server("https://soroban-testnet.stellar.org:443", {
      allowHttp: true,
    });
    this.onProgress = onProgress;
  }

  private updateProgress(progress: TxProgress): void {
    if (this.onProgress) {
      this.onProgress(progress);
    }
  }

  private async submitTx(ownerKey: string, xdr: string): Promise<string> {
    try {
      this.updateProgress({
        stage: "signing",
        message: "Waiting for wallet signature…",
      });

      const { signedXdr } = await stellar.sign({
        xdr,
        publicKeys: [ownerKey],
        network: Networks.TESTNET,
      });

      this.updateProgress({
        stage: "submitting",
        message: "Broadcasting to network…",
      });

      const tx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET) as any;
      const result = await this.server.sendTransaction(tx);

      this.updateProgress({
        stage: "confirming",
        message: "Confirming on-chain…",
      });

      const hash = result.hash;
      console.log('Transaction submitted, hash:', hash);
      let attempts = 0;
      const maxAttempts = 30; // Increased from 15 to 30 (60 seconds total)

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        try {
          const txResult = await this.server.getTransaction(hash);
          console.log(`Attempt ${attempts + 1}/${maxAttempts}: Transaction status:`, txResult.status);
          console.log(`Contract ID: ${this.contractId}`);
          if (txResult.status === "SUCCESS") {
            this.updateProgress({
              stage: "success",
              message: "Confirmed!",
              hash,
            });
            return hash;
          } else if (txResult.status === "FAILED") {
            console.error('Transaction failed:', txResult);
            throw new Error(`Transaction failed: ${txResult.resultXdr || 'No result XDR'}`);
          }
          // PENDING or other status - continue waiting
          console.log('Transaction still pending, waiting...');
        } catch (err) {
          console.error('Error checking transaction status:', err);
        }

        attempts++;
      }

      throw new Error(`Transaction confirmation timeout after ${maxAttempts * 2} seconds`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.updateProgress({
        stage: "error",
        message: errorMessage,
        errorType: error instanceof Error ? error.constructor.name : "Error",
      });
      throw error;
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

    const account = await this.server.getAccount(params.ownerKey);
    const contract = new Contract(this.contractId);
    const goalStroops = Math.round(params.goalXlm * 10_000_000);

    // Use ScInt for proper I128 encoding
    const goalVal = new ScInt(goalStroops).toScVal();

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        contract.call(
          "create_campaign",
          Address.fromString(params.ownerKey).toScVal(),
          xdr.ScVal.scvString(params.title),
          xdr.ScVal.scvString(params.description),
          goalVal,
          xdr.ScVal.scvU32(params.durationDays)
        )
      )
      .setTimeout(30)
      .build();

    console.log('Transaction XDR:', tx.toXDR());
    console.log('Contract ID:', this.contractId);
    console.log('Owner:', params.ownerKey);
    console.log('Parameters:', { title: params.title, goal: goalStroops, duration: params.durationDays });

    const txXdr = tx.toXDR();
    return this.submitTx(params.ownerKey, txXdr);
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

    const account = await this.server.getAccount(params.donorKey);
    const contract = new Contract(this.contractId);
    const amountStroops = Math.round(params.amountXlm * 10_000_000);

    // Use ScInt for proper I128 encoding
    const amountVal = new ScInt(amountStroops).toScVal();

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        contract.call(
          "donate",
          new Address(normalizeAddress(params.donorKey)).toScVal(),
          xdr.ScVal.scvU32(params.campaignId),
          amountVal,
          xdr.ScVal.scvString(params.message)
        )
      )
      .setTimeout(30)
      .build();

    const txXdr = tx.toXDR();
    return this.submitTx(params.donorKey, txXdr);
  }

  async withdraw(ownerKey: string, campaignId: number): Promise<string> {
    this.updateProgress({
      stage: "building",
      message: "Building transaction…",
    });

    const account = await this.server.getAccount(ownerKey);
    const contract = new Contract(this.contractId);

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call("withdraw", xdr.ScVal.scvU32(campaignId)))
      .setTimeout(30)
      .build();

    const txXdr = tx.toXDR();
    return this.submitTx(ownerKey, txXdr);
  }

  async getAllCampaigns(
    forceRefresh = false
  ): Promise<{ campaigns: Campaign[]; cached: boolean }> {
    const cacheKey = "campaigns:all";

    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return { campaigns: cached, cached: true };
      }
    }

    const contract = new Contract(this.contractId);
    const response = await this.server.simulateTransaction(
      new TransactionBuilder(createMockAccount(), {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(contract.call("get_all_campaigns"))
        .setTimeout(30)
        .build()
    );

    const campaigns = this.parseCampaignResponse(response as any);
    this.cache.set(cacheKey, campaigns, 15000);

    return { campaigns, cached: false };
  }

  async getActiveCampaigns(): Promise<Campaign[]> {
    const contract = new Contract(this.contractId);
    const response = await this.server.simulateTransaction(
      new TransactionBuilder(createMockAccount(), {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(contract.call("get_active_campaigns"))
        .setTimeout(30)
        .build()
    );

    return this.parseCampaignResponse(response as any);
  }

  async getCampaign(id: number): Promise<Campaign> {
    const contract = new Contract(this.contractId);
    const response = await this.server.simulateTransaction(
      new TransactionBuilder(createMockAccount(), {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(contract.call("get_campaign", xdr.ScVal.scvU32(id)))
        .setTimeout(30)
        .build()
    );

    const campaigns = this.parseCampaignResponse(response as any);
    if (campaigns.length === 0) {
      throw new Error(`Campaign ${id} not found`);
    }
    return campaigns[0];
  }

  async getUserCampaigns(ownerKey: string): Promise<Campaign[]> {
    const contract = new Contract(this.contractId);
    const response = await this.server.simulateTransaction(
      new TransactionBuilder(createMockAccount(), {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          contract.call(
            "get_user_campaigns",
            new Address(normalizeAddress(ownerKey)).toScVal()
          )
        )
        .setTimeout(30)
        .build()
    );

    return this.parseCampaignResponse(response as any);
  }

  async getDonations(
    campaignId: number,
    forceRefresh = false
  ): Promise<{ donations: Donation[]; cached: boolean }> {
    const cacheKey = `donations:${campaignId}`;

    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return { donations: cached, cached: true };
      }
    }

    const contract = new Contract(this.contractId);
    const response = await this.server.simulateTransaction(
      new TransactionBuilder(createMockAccount(), {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(contract.call("get_donations", xdr.ScVal.scvU32(campaignId)))
        .setTimeout(30)
        .build()
    );

    const donations = this.parseDonationResponse(response as any);
    this.cache.set(cacheKey, donations, 20000);

    return { donations, cached: false };
  }

  async getCampaignCount(): Promise<number> {
    const contract = new Contract(this.contractId);
    const response = await this.server.simulateTransaction(
      new TransactionBuilder(createMockAccount(), {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(contract.call("get_campaign_count"))
        .setTimeout(30)
        .build()
    );

    try {
      const result = (response as any).result?.retval;
      if (result) {
        const val = Number(result._value || 0);
        return val;
      }
    } catch {
      // Ignore parsing errors
    }
    return 0;
  }

  private parseCampaignResponse(response: any): Campaign[] {
    try {
      const result = response.result?.retval;
      if (!result || !result._value) return [];

      const vec = Array.isArray(result._value) ? result._value : [];
      return vec.map((item: any) => this.parseMapToCampaign(item)).filter(Boolean);
    } catch (error) {
      console.error("Error parsing campaigns:", error);
      return [];
    }
  }

  private parseMapToCampaign(item: any): Campaign | null {
    try {
      const mapData = item._attributes || {};
      const getVal = (key: string) => {
        const attr = mapData[key];
        return attr?._value;
      };

      return {
        id: Number(getVal("id") || 0),
        owner: String(getVal("owner") || ""),
        title: String(getVal("title") || ""),
        description: String(getVal("description") || ""),
        goal: Number(getVal("goal") || 0),
        raised: Number(getVal("raised") || 0),
        deadline: Number(getVal("deadline") || 0),
        withdrawn: Boolean(getVal("withdrawn")),
        active: Boolean(getVal("active")),
        createdAt: Number(getVal("created_at") || 0),
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
      return vec.map((item: any) => this.parseMapToDonation(item)).filter(Boolean);
    } catch (error) {
      console.error("Error parsing donations:", error);
      return [];
    }
  }

  private parseMapToDonation(item: any): Donation | null {
    try {
      const mapData = item._attributes || {};
      const getVal = (key: string) => {
        const attr = mapData[key];
        return attr?._value;
      };

      return {
        campaignId: Number(getVal("campaign_id") || 0),
        donor: String(getVal("donor") || ""),
        amount: Number(getVal("amount") || 0),
        message: String(getVal("message") || ""),
        timestamp: Number(getVal("timestamp") || 0),
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
      Math.ceil((campaign.deadline - Date.now() / 1000) / 86400)
    );
  }

  isExpired(campaign: Campaign): boolean {
    return campaign.deadline < Date.now() / 1000;
  }
}

export function createFundClient(onProgress?: (progress: TxProgress) => void) {
  return new FundContractClient(onProgress);
}

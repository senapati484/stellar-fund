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
  scValToNative,
} from "@stellar/stellar-sdk";
import { Api } from "@stellar/stellar-sdk/rpc";

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
  | { stage: "success"; message: string; hash: string }
  | { stage: "error"; message: string; errorType: string };

export interface Campaign {
  id: string;
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
  campaignId: string;
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

      // Use Horizon to poll for transaction status since Soroban RPC getTransaction has XDR parsing bugs in SDK v13
      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));

        try {
          // Poll using Horizon API via fetch (avoids SDK's broken getTransaction XDR parsing)
          const horizonUrl = "https://horizon-testnet.stellar.org";
          const response = await fetch(`${horizonUrl}/transactions/${hash}?c=0`);
          const txData = await response.json();

          if (txData.successful === true) {
            this.updateProgress({
              stage: "success",
              message: "Confirmed!",
              hash,
            });
            console.log('[ContractClient] Transaction confirmed successfully');
            return hash;
          } else if (txData.successful === false) {
            const errorMsg = `Transaction failed: ${txData.result_xdr || 'unknown'}`;
            console.error('[ContractClient] Transaction failed:', errorMsg);
            throw new Error(errorMsg);
          }
          // NOT_FOUND (pending) - continue polling
          console.log('[ContractClient] TX status: PENDING, attempt:', attempts + 1);
        } catch (err) {
          const error = err as Error;
          if (error.message && error.message.includes('failed')) {
            throw error;
          }
          console.warn(`[ContractClient] Error polling transaction (${attempts + 1}/${maxAttempts}):`, error.message);
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

      // Step 4: Extract campaign ID from simulation result (the contract returns u64)
      const createResult = simResponse.result?.retval;
      let campaignId: string;
      if (createResult?._switch?.name === 'scvU64') {
        campaignId = String(createResult._value);
      } else {
        // Fallback: use timestamp-based ID (will be replaced by real one after confirm)
        campaignId = String(Date.now());
      }
      console.log('[ContractClient] Campaign ID:', campaignId);

      // Step 5: Assemble using prepareTransaction (handles all Soroban transaction assembly)
      console.log('[ContractClient] Preparing final transaction...');
      const preparedTx = await this.server.prepareTransaction(txForSim);
      const txXdr = preparedTx.toXDR();
      console.log('[ContractClient] txXDR type:', typeof txXdr, 'length:', txXdr?.length);

      console.log('[ContractClient] Submitting transaction...');
      await this.submitTx(params.ownerKey, txXdr, simResponse);

      // Return the actual campaign ID from the contract
      return campaignId;
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
    campaignId: string | number;
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
            xdr.ScVal.scvU64(new xdr.Uint64(BigInt(params.campaignId))),
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

      // Step 4: Prepare final transaction using SDK's prepareTransaction
      console.log('[ContractClient] Preparing final transaction...');
      const preparedTx = await this.server.prepareTransaction(txForSim);
      const txXdr = preparedTx.toXDR();

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
        .addOperation(contract.call("withdraw", xdr.ScVal.scvU64(new xdr.Uint64(BigInt(campaignId)))))
        .setTimeout(300)
        .build();

      // Step 3: Simulate to get proper fee and soroban data
      console.log('[ContractClient] Simulating withdraw transaction...');
      const simResponse = await this.server.simulateTransaction(txForSim) as any;

      if (simResponse.error || simResponse.status === "error") {
        throw new Error(`Simulation failed: ${simResponse.error?.message || simResponse.error || "Unknown error"}`);
      }

      // Step 4: Prepare final transaction using SDK's prepareTransaction
      console.log('[ContractClient] Preparing final transaction...');
      const preparedTx = await this.server.prepareTransaction(txForSim);
      const txXdr = preparedTx.toXDR();

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

      const campaign = this.parseSingleCampaignResponse(result as any);
      if (!campaign) {
        throw new Error(`Campaign ${id} not found`);
      }
      return campaign;
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
    campaignId: string,
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
            contract.call("get_donations", xdr.ScVal.scvU64(new xdr.Uint64(BigInt(campaignId)))),
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

  private parseSingleCampaignResponse(response: any): Campaign | null {
    try {
      const result = response.result?.retval;
      if (!result) {
        return null;
      }

      const native = scValToNative(result) as Record<string, any>;
      return this.parseCampaignFromNative(native);
    } catch (error) {
      console.error("Error parsing single campaign:", error);
      return null;
    }
  }

  private parseCampaignResponse(response: any): Campaign[] {
    try {
      const result = response.result?.retval;
      if (!result) {
        return [];
      }

      const native = scValToNative(result) as Record<string, any>[];
      if (!Array.isArray(native)) {
        return [];
      }

      return native.map(this.parseCampaignFromNative);
    } catch (error) {
      console.error("Error parsing campaigns:", error);
      return [];
    }
  }

  private parseCampaignFromNative = (item: Record<string, any>): Campaign => {
    return {
      id: String(item.id ?? "0"),
      owner: item.owner ? String(item.owner) : "",
      title: item.title ? String(item.title) : "",
      description: item.description ? String(item.description) : "",
      goal: Number(item.goal ?? BigInt(0)) / 10_000_000,
      raised: Number(item.raised ?? BigInt(0)) / 10_000_000,
      deadline: Number(item.deadline ?? BigInt(0)),
      withdrawn: Boolean(item.withdrawn ?? false),
      active: Boolean(item.active ?? true),
      createdAt: Number(item.created_at ?? BigInt(0)),
    };
  }

  private parseDonationResponse(response: any): Donation[] {
    try {
      const result = response.result?.retval;
      if (!result) return [];

      const native = scValToNative(result) as Record<string, any>[];
      if (!Array.isArray(native)) return [];

      return native.map(this.parseDonationFromNative);
    } catch (error) {
      console.error("Error parsing donations:", error);
      return [];
    }
  }

  private parseDonationFromNative = (item: Record<string, any>): Donation => {
    return {
      campaignId: String(item.campaign_id ?? "0"),
      donor: item.donor ? String(item.donor) : "",
      amount: Number(item.amount ?? BigInt(0)) / 10_000_000,
      message: item.message ? String(item.message) : "",
      timestamp: Number(item.timestamp ?? BigInt(0)),
    };
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

import {
  Soroban,
  xdr,
  Contract,
  TransactionBuilder,
  BASE_FEE,
  Networks,
  ScInt,
  Address,
} from '@stellar/stellar-sdk';
import { stellar } from './stellar-helper';

export type TxProgress =
  | { stage: 'idle' }
  | { stage: 'building'; message: 'Building transaction…' }
  | { stage: 'signing'; message: 'Waiting for wallet signature…' }
  | { stage: 'submitting'; message: 'Broadcasting to network…' }
  | { stage: 'confirming'; message: 'Confirming on-chain…' }
  | { stage: 'success'; message: 'Confirmed!'; hash: string }
  | { stage: 'error'; message: string; errorType: string };

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
  private server: SorobanRpc.Server;
  private cache = new TTLCache<any>();
  private onProgress?: (progress: TxProgress) => void;

  constructor(onProgress?: (progress: TxProgress) => void) {
    this.contractId = process.env.NEXT_PUBLIC_CONTRACT_ID || '';
    if (!this.contractId) {
      throw new Error('NEXT_PUBLIC_CONTRACT_ID not set');
    }

    this.server = new SorobanRpc.Server('https://soroban-testnet.stellar.org', {
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
      this.updateProgress({ stage: 'signing', message: 'Waiting for wallet signature…' });

      const { signedXdr } = await stellar['walletKit'].sign({
        xdr,
        publicKeys: [ownerKey],
        network: Networks.TESTNET,
      });

      this.updateProgress({ stage: 'submitting', message: 'Broadcasting to network…' });

      const tx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET) as any;
      const result = await this.server.sendTransaction(tx);

      this.updateProgress({ stage: 'confirming', message: 'Confirming on-chain…' });

      const hash = result.hash;
      let attempts = 0;
      const maxAttempts = 15; // 30 seconds total (2s * 15)

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        const txResult = await this.server.getTransaction(hash);
        if (txResult.status === 'success') {
          this.updateProgress({ stage: 'success', message: 'Confirmed!', hash });
          return hash;
        } else if (txResult.status === 'error') {
          throw new Error(`Transaction failed: ${txResult.resultXdr}`);
        }

        attempts++;
      }

      throw new Error('Transaction confirmation timeout');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateProgress({
        stage: 'error',
        message: errorMessage,
        errorType: error instanceof Error ? error.constructor.name : 'Error',
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
    this.updateProgress({ stage: 'building', message: 'Building transaction…' });

    const account = await this.server.getAccount(params.ownerKey);
    const contract = new Contract(this.contractId);
    const goalStroops = Math.round(params.goalXlm * 10_000_000);

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        contract.call(
          'create_campaign',
          new xdr.ScAddress(
            xdr.ScAddressType.ScAddressTypeEd25519(),
            Buffer.from(params.ownerKey, 'hex')
          ),
          new xdr.String(params.title),
          new xdr.String(params.description),
          new ScInt(goalStroops).toU64(),
          new ScInt(params.durationDays).toU32()
        )
      )
      .setTimeout(30)
      .build();

    const txXdr = tx.toXDR();
    return this.submitTx(params.ownerKey, txXdr);
  }

  async recordDonation(params: {
    donorKey: string;
    campaignId: number;
    amountXlm: number;
    message: string;
  }): Promise<string> {
    this.updateProgress({ stage: 'building', message: 'Building transaction…' });

    const account = await this.server.getAccount(params.donorKey);
    const contract = new Contract(this.contractId);
    const amountStroops = Math.round(params.amountXlm * 10_000_000);

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        contract.call(
          'donate',
          new xdr.ScAddress(
            xdr.ScAddressType.ScAddressTypeEd25519(),
            Buffer.from(params.donorKey, 'hex')
          ),
          new ScInt(params.campaignId).toU32(),
          new ScInt(amountStroops).toI128(),
          new xdr.String(params.message)
        )
      )
      .setTimeout(30)
      .build();

    const txXdr = tx.toXDR();
    return this.submitTx(params.donorKey, txXdr);
  }

  async withdraw(ownerKey: string, campaignId: number): Promise<string> {
    this.updateProgress({ stage: 'building', message: 'Building transaction…' });

    const account = await this.server.getAccount(ownerKey);
    const contract = new Contract(this.contractId);

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        contract.call('withdraw', new ScInt(campaignId).toU32())
      )
      .setTimeout(30)
      .build();

    const txXdr = tx.toXDR();
    return this.submitTx(ownerKey, txXdr);
  }

  async getAllCampaigns(forceRefresh = false): Promise<{ campaigns: Campaign[]; cached: boolean }> {
    const cacheKey = 'campaigns:all';

    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return { campaigns: cached, cached: true };
      }
    }

    const contract = new Contract(this.contractId);
    const result = await this.server.simulateTransaction(
      new TransactionBuilder(new xdr.ScVal(), {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(contract.call('get_all_campaigns'))
        .build()
    );

    const campaigns = this.parseCampaigns(result.result?.xdr);
    this.cache.set(cacheKey, campaigns, 15000); // 15s TTL

    return { campaigns, cached: false };
  }

  async getActiveCampaigns(): Promise<Campaign[]> {
    const contract = new Contract(this.contractId);
    const result = await this.server.simulateTransaction(
      new TransactionBuilder(new xdr.ScVal(), {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(contract.call('get_active_campaigns'))
        .build()
    );

    return this.parseCampaigns(result.result?.xdr);
  }

  async getCampaign(id: number): Promise<Campaign> {
    const contract = new Contract(this.contractId);
    const result = await this.server.simulateTransaction(
      new TransactionBuilder(new xdr.ScVal(), {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(contract.call('get_campaign', new ScInt(id).toU32()))
        .build()
    );

    const campaigns = this.parseCampaigns(result.result?.xdr);
    if (campaigns.length === 0) {
      throw new Error(`Campaign ${id} not found`);
    }
    return campaigns[0];
  }

  async getUserCampaigns(ownerKey: string): Promise<Campaign[]> {
    const contract = new Contract(this.contractId);
    const result = await this.server.simulateTransaction(
      new TransactionBuilder(new xdr.ScVal(), {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          contract.call(
            'get_user_campaigns',
            new xdr.ScAddress(
              xdr.ScAddressType.ScAddressTypeEd25519(),
              Buffer.from(ownerKey, 'hex')
            )
          )
        )
        .build()
    );

    return this.parseCampaigns(result.result?.xdr);
  }

  async getDonations(campaignId: number, forceRefresh = false): Promise<{ donations: Donation[]; cached: boolean }> {
    const cacheKey = `donations:${campaignId}`;

    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return { donations: cached, cached: true };
      }
    }

    const contract = new Contract(this.contractId);
    const result = await this.server.simulateTransaction(
      new TransactionBuilder(new xdr.ScVal(), {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(contract.call('get_donations', new ScInt(campaignId).toU32()))
        .build()
    );

    const donations = this.parseDonations(result.result?.xdr);
    this.cache.set(cacheKey, donations, 20000); // 20s TTL

    return { donations, cached: false };
  }

  async getCampaignCount(): Promise<number> {
    const contract = new Contract(this.contractId);
    const result = await this.server.simulateTransaction(
      new TransactionBuilder(new xdr.ScVal(), {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(contract.call('get_campaign_count'))
        .build()
    );

    if (result.result?.xdr) {
      const val = xdr.ScVal.fromXDR(result.result.xdr, 'base64');
      return new ScInt(val.u32()).toNumber();
    }
    return 0;
  }

  private parseCampaigns(xdrStr?: string): Campaign[] {
    if (!xdrStr) return [];

    try {
      const val = xdr.ScVal.fromXDR(xdrStr, 'base64');
      if (!val.vec || val.vec.length === 0) return [];

      return val.vec.map(scv => {
        const obj = scv.obj;
        if (!obj) throw new Error('Invalid campaign structure');

        const map = new Map(
          obj.map(entry => [
            entry.key.str().toString(),
            entry.val,
          ])
        );

        return {
          id: new ScInt(map.get('id')?.u32() || 0).toNumber(),
          owner: map.get('owner')?.address()?.ed25519()?.toString('hex') || '',
          title: map.get('title')?.str().toString() || '',
          description: map.get('description')?.str().toString() || '',
          goal: new ScInt(map.get('goal')?.i128() || 0).toNumber(),
          raised: new ScInt(map.get('raised')?.i128() || 0).toNumber(),
          deadline: new ScInt(map.get('deadline')?.u64() || 0).toNumber(),
          withdrawn: map.get('withdrawn')?.b() || false,
          active: map.get('active')?.b() || false,
          createdAt: new ScInt(map.get('created_at')?.u64() || 0).toNumber(),
        };
      });
    } catch (error) {
      console.error('Error parsing campaigns:', error);
      return [];
    }
  }

  private parseDonations(xdrStr?: string): Donation[] {
    if (!xdrStr) return [];

    try {
      const val = xdr.ScVal.fromXDR(xdrStr, 'base64');
      if (!val.vec || val.vec.length === 0) return [];

      return val.vec.map(scv => {
        const obj = scv.obj;
        if (!obj) throw new Error('Invalid donation structure');

        const map = new Map(
          obj.map(entry => [
            entry.key.str().toString(),
            entry.val,
          ])
        );

        return {
          campaignId: new ScInt(map.get('campaign_id')?.u32() || 0).toNumber(),
          donor: map.get('donor')?.address()?.ed25519()?.toString('hex') || '',
          amount: new ScInt(map.get('amount')?.i128() || 0).toNumber(),
          message: map.get('message')?.str().toString() || '',
          timestamp: new ScInt(map.get('timestamp')?.u64() || 0).toNumber(),
        };
      });
    } catch (error) {
      console.error('Error parsing donations:', error);
      return [];
    }
  }

  getProgressPercent(campaign: Campaign): number {
    return Math.min(100, Math.round((campaign.raised / campaign.goal) * 100));
  }

  getDaysLeft(campaign: Campaign): number {
    return Math.max(0, Math.ceil((campaign.deadline - Date.now() / 1000) / 86400));
  }

  isExpired(campaign: Campaign): boolean {
    return campaign.deadline < Date.now() / 1000;
  }
}

export function createFundClient(onProgress?: (progress: TxProgress) => void) {
  return new FundContractClient(onProgress);
}

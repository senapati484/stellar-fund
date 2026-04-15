import { Horizon, Server, StellarWalletsKit } from '@stellar/stellar-sdk';

export class WalletNotFoundError extends Error {
  name = 'WalletNotFoundError';
}

export class WalletRejectedError extends Error {
  name = 'WalletRejectedError';
}

export class InsufficientBalanceError extends Error {
  name = 'InsufficientBalanceError';
}

export class DestinationUnfundedError extends Error {
  name = 'DestinationUnfundedError';
}

export class ContractError extends Error {
  name = 'ContractError';
}

export class CampaignExpiredError extends Error {
  name = 'CampaignExpiredError';
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

class StellarHelper {
  private server: Server;
  private walletKit: StellarWalletsKit;
  private networkPassphrase: string;
  private cache = new TTLCache<any>();

  constructor(network: 'testnet' | 'mainnet' = 'testnet') {
    this.networkPassphrase = network === 'testnet'
      ? 'Test SDF Network ; September 2015'
      : 'Public Global Stellar Network ; September 2015';
    
    this.server = new Server(network === 'testnet'
      ? 'https://horizon-testnet.stellar.org'
      : 'https://horizon.stellar.org');
    
    this.walletKit = new StellarWalletsKit({
      allowAllModules: true,
    });
  }

  async connectWallet(): Promise<string> {
    try {
      const { publicKey } = await this.walletKit.connect();
      if (!publicKey) {
        throw new WalletNotFoundError('No public key returned from wallet');
      }
      return publicKey;
    } catch (error) {
      if (error instanceof Error && error.message.includes('user rejected')) {
        throw new WalletRejectedError('User rejected wallet connection');
      }
      throw new WalletNotFoundError('Failed to connect wallet');
    }
  }

  disconnect(): void {
    this.walletKit.disconnect();
    this.cache.invalidateAll();
  }

  async getBalance(publicKey: string, forceRefresh = false): Promise<{ xlm: string; cached: boolean }> {
    const cacheKey = `balance:${publicKey}`;
    
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return { xlm: cached, cached: true };
      }
    }

    try {
      const account = await this.server.loadAccount(publicKey);
      const balance = account.balances
        .filter((b: any) => b.asset_type === 'native')
        .map((b: any) => b.balance)[0] || '0';
      
      this.cache.set(cacheKey, balance, 30000); // 30s TTL
      return { xlm: balance, cached: false };
    } catch (error) {
      throw new InsufficientBalanceError('Failed to load account balance');
    }
  }

  async sendPayment(params: {
    from: string;
    to: string;
    amount: string;
    memo?: string;
  }): Promise<{ hash: string; success: boolean }> {
    try {
      const sourceAccount = await this.server.loadAccount(params.from);
      const transaction = new Horizon.TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          Horizon.Operation.payment({
            destination: params.to,
            asset: Horizon.Asset.native(),
            amount: params.amount,
          })
        )
        .setTimeout(30);

      if (params.memo) {
        transaction.addMemo(Horizon.Memo.text(params.memo));
      }

      const transactionBuilt = transaction.build();
      const { signedXdr } = await this.walletKit.sign({
        xdr: transactionBuilt.toXDR(),
        publicKeys: [params.from],
        network: this.networkPassphrase,
      });

      const signedTransaction = Horizon.TransactionBuilder.fromXDR(
        signedXdr,
        this.networkPassphrase
      ) as Horizon.Transaction;

      const result = await this.server.submitTransaction(signedTransaction);
      
      // Invalidate balance cache for both sender and receiver
      this.cache.invalidate(`balance:${params.from}`);
      this.cache.invalidate(`balance:${params.to}`);

      return { hash: result.hash, success: true };
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new DestinationUnfundedError('Destination account not found');
      }
      throw error;
    }
  }

  getExplorerLink(hash: string, type: 'tx' | 'account' | 'contract'): string {
    const baseUrl = this.networkPassphrase.includes('Test')
      ? 'https://stellar.expert/explorer/testnet'
      : 'https://stellar.expert/explorer/public';
    
    return `${baseUrl}/${type}/${hash}`;
  }

  formatAddress(address: string, start = 4, end = 4): string {
    if (address.length <= start + end) return address;
    return `${address.slice(0, start)}...${address.slice(-end)}`;
  }

  formatXLM(stroops: number, decimals = 2): string {
    const xlm = stroops / 10_000_000;
    return xlm.toFixed(decimals);
  }
}

export const stellar = new StellarHelper('testnet');

import { Horizon, TransactionBuilder, Operation, Asset, Memo, Networks } from "@stellar/stellar-sdk";
import {
  isConnected,
  getAddress,
  signTransaction,
  requestAccess,
} from "@stellar/freighter-api";

export class WalletNotFoundError extends Error {
  name = "WalletNotFoundError";
}

export class WalletRejectedError extends Error {
  name = "WalletRejectedError";
}

export class InsufficientBalanceError extends Error {
  name = "InsufficientBalanceError";
}

export class DestinationUnfundedError extends Error {
  name = "DestinationUnfundedError";
}

export class ContractError extends Error {
  name = "ContractError";
}

export class CampaignExpiredError extends Error {
  name = "CampaignExpiredError";
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
  private server: Horizon.Server;
  private networkPassphrase: string;
  private cache = new TTLCache<any>();
  private connectedPublicKey: string | null = null;

  constructor(network: "testnet" | "mainnet" = "testnet") {
    this.networkPassphrase =
      network === "testnet"
        ? "Test SDF Network ; September 2015"
        : "Public Global Stellar Network ; September 2015";

    this.server = new Horizon.Server(
      network === "testnet"
        ? "https://horizon-testnet.stellar.org"
        : "https://horizon.stellar.org"
    );
  }

  async connectWallet(): Promise<string> {
    try {
      if (typeof window === "undefined") {
        throw new WalletNotFoundError("No wallet available in non-browser environment");
      }

      const connected = await isConnected();
      if (!connected) {
        throw new WalletNotFoundError("Freighter wallet not installed");
      }

      const { address } = await requestAccess();
      if (!address) {
        throw new WalletNotFoundError("No public key returned from wallet");
      }

      this.connectedPublicKey = address;
      return address;
    } catch (error) {
      if (error instanceof WalletNotFoundError) {
        throw error;
      }
      if (error instanceof Error && error.message.includes("user rejected")) {
        throw new WalletRejectedError("User rejected wallet connection");
      }
      throw new WalletNotFoundError("Failed to connect wallet");
    }
  }

  disconnect(): void {
    this.connectedPublicKey = null;
    this.cache.invalidateAll();
  }

  async sign(params: {
    xdr: string;
    publicKeys: string[];
    network: string;
  }): Promise<{ signedXdr: string }> {
    try {
      if (typeof window === "undefined") {
        throw new Error("No wallet available in non-browser environment");
      }

      const connected = await isConnected();
      if (!connected) {
        throw new Error("Freighter wallet not installed");
      }

      const result = await signTransaction(params.xdr, {
        networkPassphrase: params.network,
      });

      if (!result || result.error) {
        throw new Error(result?.error?.message || "Failed to sign transaction");
      }

      return { signedXdr: result.signedTxXdr };
    } catch (error) {
      throw new Error(
        `Failed to sign transaction: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async getBalance(
    publicKey: string,
    forceRefresh = false
  ): Promise<{ xlm: string; cached: boolean }> {
    const cacheKey = `balance:${publicKey}`;

    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return { xlm: cached, cached: true };
      }
    }

    try {
      const account = await this.server.loadAccount(publicKey);
      const balance =
        account.balances
          .filter((b: any) => b.asset_type === "native")
          .map((b: any) => b.balance)[0] || "0";

      this.cache.set(cacheKey, balance, 30000);
      return { xlm: balance, cached: false };
    } catch (error) {
      throw new InsufficientBalanceError("Failed to load account balance");
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
      const transaction = new TransactionBuilder(sourceAccount, {
        fee: "100",
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          Operation.payment({
            destination: params.to,
            asset: Asset.native(),
            amount: params.amount,
          })
        )
        .setTimeout(30);

      if (params.memo) {
        transaction.addMemo(Memo.text(params.memo));
      }

      const transactionBuilt = transaction.build();
      const { signedXdr } = await this.sign({
        xdr: transactionBuilt.toXDR(),
        publicKeys: [params.from],
        network: this.networkPassphrase,
      });

      const signedTransaction = TransactionBuilder.fromXDR(
        signedXdr,
        this.networkPassphrase
      ) as any;

      const result = await this.server.submitTransaction(signedTransaction);

      this.cache.invalidate(`balance:${params.from}`);
      this.cache.invalidate(`balance:${params.to}`);

      return { hash: result.hash, success: true };
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new DestinationUnfundedError("Destination account not found");
      }
      throw error;
    }
  }

  getExplorerLink(
    hash: string,
    type: "tx" | "account" | "contract"
  ): string {
    const baseUrl = this.networkPassphrase.includes("Test")
      ? "https://stellar.expert/explorer/testnet"
      : "https://stellar.expert/explorer/public";

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

export const stellar = new StellarHelper("testnet");

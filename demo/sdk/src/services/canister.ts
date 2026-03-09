import type {
  CanisterService,
  BuyTokenParams,
  SellTokenParams,
  TransferTokenParams,
  WithdrawBtcParams,
  DepositTokenParams,
  TransferResult,
  WithdrawResult,
  DepositResult,
  WithdrawProtocol,
} from '../types/canister';
import type { AuthManager } from '../types/auth';
import type { _ODIN_SERVICE } from '../canister/odin_canister';
import { OdinCanisterError, OdinAuthError } from '../utils/errors';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from '../canister/odin_canister.idl';
import { ODIN_CANISTER_ID } from '../constants/canister';

/**
 * Canister service implementation for direct blockchain operations
 */
export class CanisterServiceImpl implements CanisterService {
  private authManager: AuthManager;
  private agent: HttpAgent | null = null;
  private actor: _ODIN_SERVICE | null = null;

  constructor(authManager: AuthManager) {
    this.authManager = authManager;
  }

  /**
   * Get or create IC agent withto delegation identity
   */
  private async getAgent(): Promise<HttpAgent> {
    if (!this.agent) {
      this.ensureAuthenticated();

      const identity = this.authManager.getDelegationIdentity();
      if (!identity) {
        throw new OdinAuthError('No delegation identity available');
      }

      this.agent = new HttpAgent({
        identity,
        host: 'https://ic0.app',
      });

      // Fetch root key for local development (not needed in production)
      if (process.env.NODE_ENV === 'development') {
        await this.agent.fetchRootKey();
      }
    }

    return this.agent;
  }

  /**
   * Get or create canister actor
   */
  private async getActor(): Promise<_ODIN_SERVICE> {
    if (!this.actor) {
      const agent = await this.getAgent();

      this.actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: ODIN_CANISTER_ID,
      }) as _ODIN_SERVICE;
    }

    return this.actor;
  }

  /**
   * Convert our WithdrawProtocol to canister format
   */
  private mapWithdrawProtocol(protocol: WithdrawProtocol) {
    switch (protocol) {
      case 'btc':
        return { BTC: null };
      case 'ckbtc':
        return { CKBTC: null };
      case 'volt':
        return { VOLT: null };
      default:
        throw new OdinCanisterError(`Unsupported withdrawal protocol: ${protocol}`);
    }
  }

  /**
   * Buy tokens with BTC
   */
  async buyTokenWithBtc(params: BuyTokenParams): Promise<boolean> {
    this.ensureAuthenticated();

    try {
      const actor = await this.getActor();
      const tradeOperation = {
        typeof: { buy: null },
        tokenid: params.tokenId,
        amount: {
          btc: params.btcAmount,
        },
        settings: [] as [],
      };

      const result = await actor.token_trade(tradeOperation);

      if ('ok' in result) {
        return true;
      } else {
        // Handle error response (err is a string)
        const error = result.err;
        throw new OdinCanisterError(`Buy transaction failed: ${error}`);
      }
    } catch (error) {
      if (error instanceof OdinCanisterError) {
        throw error;
      }

      throw new OdinCanisterError(
        `Failed to buy token with BTC: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Sell token amount
   */
  async sellTokenAmount(params: SellTokenParams): Promise<boolean> {
    this.ensureAuthenticated();

    throw new Error('Not implemented');
  }

  /**
   * Transfer tokens to another user
   */
  async transferToken(params: TransferTokenParams): Promise<TransferResult> {
    this.ensureAuthenticated();

    throw new Error('Not implemented');
  }

  /**
   * Withdraw BTC to external address
   */
  async withdrawBtc(params: WithdrawBtcParams): Promise<WithdrawResult> {
    this.ensureAuthenticated();

    throw new Error('Not implemented');
  }

  /**
   * Deposit tokens to the canister
   */
  async depositToken(params: DepositTokenParams): Promise<DepositResult> {
    this.ensureAuthenticated();

    try {
      const actor = await this.getActor();

      const newBalance = await actor.token_deposit(params.tokenId, params.amount);

      return {
        newBalance,
      };
    } catch (error) {
      // Handle deposit-specific errors
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('insufficient')) {
          throw new OdinCanisterError('Insufficient balance for deposit');
        } else if (errorMessage.includes('token not found')) {
          throw new OdinCanisterError('Token not found');
        } else if (errorMessage.includes('invalid amount')) {
          throw new OdinCanisterError('Invalid deposit amount');
        } else if (errorMessage.includes('deposits paused')) {
          throw new OdinCanisterError('Deposits are currently paused');
        } else if (errorMessage.includes('unauthorized')) {
          throw new OdinCanisterError('Unauthorized to perform this deposit');
        }
      }

      throw new OdinCanisterError(
        `Failed to deposit token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Ensure user is authenticated before canister calls
   */
  private ensureAuthenticated(): void {
    if (!this.authManager.isAuthenticated()) {
      throw new OdinAuthError('User must be authenticated to perform canister operations');
    }
  }

  /**
   * Clear cached agent and actor (useful for re-authentication)
   */
  public clearCache(): void {
    this.agent = null;
    this.actor = null;
  }
}

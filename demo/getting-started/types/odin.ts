/**
 * Result of a successful deposit operation
 */
export interface DepositResult {
  /** New balance after deposit */
  newBalance: bigint;
}

export type TokenAmount = bigint;
export type TradeType = { buy: null } | { sell: null }
export type TradeAmount = { btc: TokenAmount } | { token: TokenAmount }

export interface TradeSettings { 'slippage' : [] | [[TokenAmount, bigint]] }

export interface TradeRequest {
  tokenid: string;
  typeof: TradeType;
  amount: TradeAmount;
  settings: [] | [TradeSettings];
}

export type TradeResponse = { 'ok' : null } |
  { 'err' : string };
/**
 * Odin Actor Interface
 */
export interface OdinActor {
  /** Deposit tokens to the canister */
  token_deposit(tokenId: string, amount: bigint): Promise<DepositResult>;
  token_trade(tradeRequest: TradeRequest): Promise<TradeResponse>;
}
export interface Token {
  // Basic token fields
  id: string;
  name: string;
  ticker: string | null;
  image: string | null;
  rune?: string | null;
  rune_id?: string | null;
  decimals: number;
  divisibility: number;
  trading: boolean;
  deposits?: boolean;
  withdrawals?: boolean;

  // Extended token fields
  description?: string | null;
  creator: string;
  created_time: Date;
  marketcap: bigint;
  volume: bigint;
  volume_24?: number;
  holder_count: number;
  power_holder_count: number;
  sell_count: number;
  buy_count: number;
  comment_count: number;
  featured: boolean;
  bonded: boolean;
  external: boolean;
  icrc_ledger: string | null;
  sold: bigint;
  total_supply: bigint;
  threshold: bigint;
  swap_volume?: bigint;
  swap_volume_24?: bigint;
  holding_value?: number;
  price: number;
  twitter?: string;
  twitter_verified?: boolean;
  website?: string;
  telegram?: string;
  btc_liquidity: bigint;
  token_liquidity: bigint;
  liquidity_threshold: bigint;
  last_comment_time: string | null;
  last_action_time: Date | null;
  user_lp_tokens: bigint;
  user_btc_liquidity: bigint;
  user_token_liquidity: bigint;
  verified?: boolean;
  progress?: number;
  price_5m?: number;
  price_1h?: number;
  price_6h?: number;
  price_1d?: number;
  price_delta_5m?: number;
  price_delta_1h?: number;
  price_delta_6h?: number;
  price_delta_1d?: number;

  // Calculated fields
  bonding_curve: number;
  ownership: number;
  balance: bigint;
}

import { login, prepare } from './core/prepare';
import { createSampleWallet } from './sample-wallet';
import { authenticateCallback } from './core/auth-callback';
import { getActor } from './utils/odin';
import { Token } from './types/token';
import { getPriceImpact } from './utils/getPriceImpact';
import { TradeRequest, TradeSettings } from './types/odin';

const ODIN_API_URL = 'https://api.odin.fun/dev'; // https://api.odin.fun/v1 for prod

(async () => {
  const wallet = await createSampleWallet();
  const result = await prepare(wallet.address);

  const signature = await wallet.signMessage(result.message);

  const identity = await login({
    address: wallet.address,
    message: result.message,
    signature: signature,
    publicKey: wallet.publicKey,
    signatureType: 'Bip322Simple',
  });

  // Used for API calls.
  const token = await authenticateCallback(identity);

  const odin = getActor(identity);

  const BITCOIN = {
    id: 'btc',
    name: 'Bitcoin',
    ticker: 'BTC',
    image: 'https://upload.wikimedia.org/wikipedia/commons/4/46/Bitcoin.svg',
    rune: null,
    divisibility: 8,
    decimals: 3,
  };

  const btc = 0.001; 
  const amount = BigInt(btc * 10 ** (BITCOIN.divisibility + BITCOIN.decimals));
  const newBalance  = await odin.token_deposit(BITCOIN.id, amount);

  console.log({
    newBalance,
  });

  const response = await fetch(`${ODIN_API_URL}/tokens?page=1&limit=30`);
  const data: { data: Token[] } = await response.json();

  const tokenToBuy = data.data.find((token: any) => token.trading);
  if (!tokenToBuy) {
    throw new Error('No token to buy found');
  }

  const amountToBuyBtc = 0.0001; 
  const amountToBuy = BigInt(amountToBuyBtc * 10 ** (BITCOIN.divisibility + BITCOIN.decimals));
  const priceImpact = getPriceImpact("btc", amountToBuyBtc.toString(), tokenToBuy, true);
  
  if (!priceImpact) {
    throw new Error('Price impact not found');
  }

  const percentageImpact = priceImpact * 100;

  if (percentageImpact > 10) {
    throw new Error('Price impact is too high');
  }

  const warningLevel = percentageImpact > 10 ? "⚠️ High" : 
                        percentageImpact > 5 ? "⚡ Medium" : 
                        "✅ Low";

  console.log(` Impact: ${warningLevel} ${percentageImpact.toFixed(2)}%`);

  const buyRequest: TradeRequest = {
    tokenid: tokenToBuy.id,
    typeof: { buy: null },
    amount: { btc: amountToBuy }, 
    settings: [],
  };

  const buyResult = await odin.token_trade(buyRequest);
  if ('err' in buyResult) {
    throw new Error(buyResult.err);
  }

  console.log('✅ Token purchase completed successfully!');
  console.log(`Purchased ${tokenToBuy.name} tokens with ${amountToBuyBtc} BTC`);

  // Sample buy with slippage protection
  const userSlippage = 0.5; // 5%
  const expectedPrice = tokenToBuy.price;
  const allowedSlippage = userSlippage
  ? (priceImpact ?? 0) + userSlippage
  : null;

  let slippage: any = [];
  if (expectedPrice && allowedSlippage !== null) {
    slippage = [
      [expectedPrice, BigInt(Math.floor(allowedSlippage * 100000))],
    ];
  }

  const buyRequestWithSlippage: TradeRequest = {
    tokenid: tokenToBuy.id,
    typeof: { buy: null },
    amount: { btc: amountToBuy },
    settings: [{slippage}],
  };
  
  const buyResultWithSlippage = await odin.token_trade(buyRequestWithSlippage);
  if ('err' in buyResultWithSlippage) {
    throw new Error(buyResultWithSlippage.err);
  }

  console.log('\n\n✅ Token purchase completed successfully with slippage protection!');
  console.log(`Purchased ${tokenToBuy.name} tokens with ${amountToBuyBtc} BTC with slippage protection`);
})();

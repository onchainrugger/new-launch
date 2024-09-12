import fetch from 'node-fetch';

const TOKEN = ''; 
const CHAT_ID = '';          
const THREAD_ID = '';               
const API_URL = `https://api.telegram.org/bot${TOKEN}/sendMessage`;

const sendMessageToThread = async (message) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        message_thread_id: THREAD_ID,
        parse_mode: 'Markdown',  
        disable_web_page_preview: true, 

      }),
    });
    const data = await response.json();
    if (data.ok) {
      console.log('Message sent successfully to thread:');
    } else {
      console.error('Failed to send message to thread:');
    }
  } catch (error) {
    console.error('Error sending message to thread:', error);
  }
};


const devPF = async (address) => {
  try {
    const response = await fetch(`https://frontend-api.pump.fun/coins/user-created-coins/${address}?offset=0&limit=50&includeNsfw=true`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching account transactions:', error);
    return null;
  }
};

const coinPF = async (contract) => {
  try {
    const response = await fetch(`https://frontend-api.pump.fun/coins/${contract}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching coin data:', error);
    return null;
  }
};

const newcoinPF = async () => {
  try {
    const response = await fetch(`https://frontend-api.pump.fun/coins?offset=0&limit=10&order=DESC&includeNsfw=true`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching new coins:', error);
    return null;
  }
};

function formatNumber(num) {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm';
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  } else {
    return num.toString();
  }
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const processCoinData = async (newLaunch) => {
  for (const [index, launch] of newLaunch.entries()) {
    try {
      const coind = launch.mint;
      const coinname = launch.name;
      const coinPump = await coinPF(coind);
      if (!coinPump) continue;

      const aw = Number(coinPump.usd_market_cap);
      const MarketCap = formatNumber(aw.toFixed(2));
      const address = coinPump.creator;
      const devPump = await devPF(address);
      if (!Array.isArray(devPump)) {
        console.warn(`[not array] ${launch.mint}, skipping to next...`);
        continue;
      }

      const Raydium = devPump.filter(token => token.complete === true).length;
      const KOTH = devPump.filter(token => token.king_of_the_hill_timestamp !== null).length;
      const MCAP = devPump.filter(token => token.usd_market_cap > 100000);

      let tag;
      if (MCAP.length === 1 && devPump.length < 10) {
        tag = `🌐 [${coind}](https://pump.fun/${coind})\n ├ MC : ${MarketCap}\n ├ ${coinname}\n ├ Dev [$${MCAP[0].symbol}](https://dexscreener.com/solana/${MCAP[0].mint}) (${formatNumber(MCAP[0].usd_market_cap.toFixed(2))})\n ├ Medium Risk\n ├ Deployed : ${devPump.length}\n ├ Bonded : ${Raydium}\n ├ KOTH : ${KOTH} \n └ [Trojan](https://t.me/hector_trojanbot?start=r-onchainruggers-${coind}) | [PEPE](https://t.me/pepeboost_sol_bot?start=ref_013vqk_ca_${coind})`;
        sendMessageToThread(tag);
      } else if (MCAP.length > 1) {
        const largestMCAP = MCAP.reduce((max, token) => token.usd_market_cap > max.usd_market_cap ? token : max, MCAP[0]);
        tag = `🌐 $[${coind}](https://pump.fun/${coind})\n ├ MC : ${MarketCap}\n ├ ${coinname}\n ├ Dev [$${largestMCAP.symbol}](https://dexscreener.com/solana/${largestMCAP.mint}) (${formatNumber(largestMCAP.usd_market_cap.toFixed(2))})\n ├ Low Risk\n ├ Deployed : ${devPump.length}\n ├ Bonded : ${Raydium}\n ├ KOTH : ${KOTH}\n └ [Trojan](https://t.me/hector_trojanbot?start=r-onchainruggers-${coind}) | [PEPE](https://t.me/pepeboost_sol_bot?start=ref_013vqk_ca_${coind})`;
        sendMessageToThread(tag);
      } else if (Raydium > 2 && devPump.length < 10) {
        tag = `🌐 [${coind}](https://pump.fun/${coind})\n ├ MC : ${MarketCap}\n ├ ${coinname}\n ├ High Risk\n ├ Deployed : ${devPump.length}\n ├ Bonded : ${Raydium}\n ├ KOTH : ${KOTH}\n └ [Trojan](https://t.me/hector_trojanbot?start=r-onchainruggers-${coind}) | [PEPE](https://t.me/pepeboost_sol_bot?start=ref_013vqk_ca_${coind})`;
        sendMessageToThread(tag);
      } else {
        console.warn(`[not-criteria] ${launch.mint} skipping to next...`);
      }

    } catch (error) {
      console.warn(`[404] error on ${launch.mint}, skipping to next...`,error);
    }

    await delay(10); 
  }
};


const continuouslyFetchAndProcess = async () => {
  while (true) {
    try {
      const newLaunch = await newcoinPF();
      if (newLaunch && newLaunch.length) {
        await processCoinData(newLaunch);
      }
      await new Promise(resolve => setTimeout(resolve, 10000)); 
    } catch (error) {
      console.error('Error in the continuous fetching loop:', error);
    }
  }
};

continuouslyFetchAndProcess();

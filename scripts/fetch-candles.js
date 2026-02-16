/**
 * Fetch STX (Seagate Technology) 5-minute candles from Yahoo Finance
 *
 * Usage:
 *   npm run fetch-data
 *   (from project root: candle-clash/)
 *
 * Output: app/assets/data/sample-candles.json (overwrites existing)
 *
 * Requires: npm install (to get yahoo-finance2)
 */

import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, '..', 'app', 'assets', 'data', 'sample-candles.json');

const TICKER = 'STX';
const CANDLE_COUNT = 50;
const INTERVAL_MINUTES = 5;

async function fetchCandles() {
  console.log(`Fetching ${CANDLE_COUNT} five-minute candles for ${TICKER}...`);

  try {
    // Get most recent trading day - use last 7 days to ensure we hit a trading day
    const now = new Date();
    const period1 = new Date(now);
    period1.setDate(period1.getDate() - 7);

    const result = await yahooFinance.chart(TICKER, {
      period1,
      period2: now,
      interval: '5m',
    });

    if (!result?.quotes || result.quotes.length === 0) {
      throw new Error(`No chart data returned for ${TICKER}`);
    }

    // Filter to regular market hours (9:30 AM - 4:00 PM ET) and take last 50
    const marketHoursQuotes = result.quotes.filter((q) => {
      const d = new Date(q.date);
      const hours = d.getUTCHours();
      const mins = d.getUTCMinutes();
      const totalMins = hours * 60 + mins;
      // Approx 9:30 ET = 14:30 UTC (EST) or 13:30 UTC (EDT)
      const marketOpen = 13 * 60 + 30;
      const marketClose = 20 * 60 + 0;
      return totalMins >= marketOpen && totalMins <= marketClose;
    });

    let quotes = marketHoursQuotes;
    if (quotes.length < CANDLE_COUNT) {
      quotes = result.quotes;
    }

    const last50 = quotes.slice(-CANDLE_COUNT);

    const candles = last50
      .filter((q) => q.open != null && q.high != null && q.low != null && q.close != null)
      .map((q) => ({
        time: Math.floor(new Date(q.date).getTime() / 1000),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume ?? 0,
      }));

    if (candles.length < CANDLE_COUNT) {
      console.warn(
        `Warning: Only got ${candles.length} valid candles (requested ${CANDLE_COUNT}). Using available data.`
      );
    }

    const firstDate = candles[0]
      ? new Date(candles[0].time * 1000).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const output = {
      ticker: TICKER,
      date: firstDate,
      timeframe: '5m',
      candles,
    };

    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');
    console.log(`✓ Saved ${candles.length} candles to ${OUTPUT_PATH}`);
    console.log(`  Ticker: ${TICKER}, Date: ${firstDate}, Timeframe: 5m`);
  } catch (err) {
    console.error('Error fetching candles:', err.message);
    if (err.message?.includes('No data') || err.message?.includes('Invalid')) {
      console.log('\nFallback: Generating sample STX data...');
      generateSampleData();
    } else {
      throw err;
    }
  }
}

function generateSampleData() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const baseTime = new Date(`${dateStr}T14:30:00Z`).getTime() / 1000;
  const basePrice = 95 + Math.random() * 10;

  const candles = [];
  let price = basePrice;
  for (let i = 0; i < CANDLE_COUNT; i++) {
    const change = (Math.random() - 0.48) * 0.5;
    const open = price;
    price = price + change;
    const high = Math.max(open, price) + Math.random() * 0.2;
    const low = Math.min(open, price) - Math.random() * 0.2;
    const close = price;
    candles.push({
      time: baseTime + i * 300,
      open,
      high,
      low,
      close,
      volume: Math.floor(1000000 + Math.random() * 2000000),
    });
  }

  const output = { ticker: 'STX', date: dateStr, timeframe: '5m', candles };
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  console.log(`✓ Generated ${candles.length} sample candles at ${OUTPUT_PATH}`);
}

fetchCandles();

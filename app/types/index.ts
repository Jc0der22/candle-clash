/**
 * Candle Clash - Stock Trading Game Types
 */

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = '5min' | '15min';

export interface GameState {
  candles: Candle[];
  currentCandleIndex: number;
  cash: number;
  shares: number;
  totalInvested: number;
  isPlaying: boolean;
  isPaused: boolean;
  gameOver: boolean;
  totalTrades: number;
  tickIntervalMs: number;
  timeframe: Timeframe;
}

export type BuyAmount = 5000 | 10000 | 20000;
export type SellAmount = 5000 | 10000 | 'half' | 'all';

export const BUY_AMOUNTS: BuyAmount[] = [5000, 10000, 20000];
export const SELL_AMOUNTS: SellAmount[] = [5000, 10000, 'half', 'all'];
export const STARTING_CASH = 100000;
export const TICK_INTERVAL_MS = 3000;

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import type { Candle, GameState, BuyAmount, SellAmount, Timeframe } from '../types';
import {
  BUY_AMOUNTS,
  STARTING_CASH,
  TICK_INTERVAL_MS,
} from '../types';
import { Chart } from '../components/Chart';

const candleData = require('../assets/data/sample-candles.json') as {
  ticker: string;
  date: string;
  timeframe: string;
  candles: Candle[];
};

const RAW_CANDLES = candleData.candles;

function aggregateTo15Min(candles5min: Candle[]): Candle[] {
  const result: Candle[] = [];
  for (let i = 0; i < candles5min.length; i += 3) {
    const chunk = candles5min.slice(i, i + 3);
    if (chunk.length === 0) continue;
    result.push({
      time: chunk[0].time,
      open: chunk[0].open,
      high: Math.max(...chunk.map((c) => c.high)),
      low: Math.min(...chunk.map((c) => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((sum, c) => sum + c.volume, 0),
    });
  }
  return result;
}

function getCandlesForTimeframe(timeframe: Timeframe): Candle[] {
  return timeframe === '15min' ? aggregateTo15Min(RAW_CANDLES) : RAW_CANDLES;
}

const SPEED_OPTIONS = [
  { label: '1x', value: 5000 },
  { label: '2x', value: 3000 },
  { label: '3x', value: 1500 },
  { label: '5x', value: 1000 },
] as const;

type TradeFlash = { type: 'buy' | 'sell'; amount: number; price: number } | null;

function createInitialState(timeframe: Timeframe = '5min'): GameState {
  return {
    candles: getCandlesForTimeframe(timeframe),
    currentCandleIndex: 0,
    cash: STARTING_CASH,
    shares: 0,
    totalInvested: 0,
    isPlaying: false,
    isPaused: false,
    gameOver: false,
    totalTrades: 0,
    tickIntervalMs: TICK_INTERVAL_MS,
    timeframe,
  };
}

const pendingGlow = Platform.select({
  ios: {
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  android: { elevation: 8 },
});

export default function GameScreen() {
  const [state, setState] = useState<GameState>(createInitialState);
  const [showProfitFlash, setShowProfitFlash] = useState(false);
  const [lastSellProfit, setLastSellProfit] = useState(0);
  const [showTradeFlash, setShowTradeFlash] = useState<TradeFlash>(null);
  const [isSwitchingTimeframe, setIsSwitchingTimeframe] = useState(false);
  const [switchingToTimeframe, setSwitchingToTimeframe] =
    useState<Timeframe | null>(null);

  const handleTimeframeChange = useCallback((newTimeframe: Timeframe) => {
    if (newTimeframe === state.timeframe) return;

    setIsSwitchingTimeframe(true);
    setSwitchingToTimeframe(newTimeframe);

    const newCandles =
      newTimeframe === '15min' ? aggregateTo15Min(RAW_CANDLES) : RAW_CANDLES;

    let newCurrentIndex: number;
    if (newTimeframe === '15min') {
      newCurrentIndex = Math.floor(state.currentCandleIndex / 3);
    } else {
      newCurrentIndex = state.currentCandleIndex * 3;
    }
    newCurrentIndex = Math.max(
      0,
      Math.min(newCurrentIndex, newCandles.length - 1)
    );

    setState((prev) => ({
      ...prev,
      timeframe: newTimeframe,
      candles: newCandles,
      currentCandleIndex: newCurrentIndex,
    }));

    setTimeout(() => {
      setIsSwitchingTimeframe(false);
      setSwitchingToTimeframe(null);
    }, 500);
  }, [state.timeframe, state.currentCandleIndex]);

  const {
    currentCandleIndex,
    cash,
    shares,
    totalInvested,
    isPlaying,
    isPaused,
    gameOver,
    totalTrades,
    tickIntervalMs,
    timeframe,
  } = state;

  const currentCandle = state.candles[currentCandleIndex];
  const fillPrice = currentCandle?.close ?? currentCandle?.open ?? 0;
  const accountValue = cash + shares * fillPrice;
  const profitLoss = accountValue - STARTING_CASH;
  const profitLossPercent =
    STARTING_CASH > 0 ? (profitLoss / STARTING_CASH) * 100 : 0;

  const avgCost = shares > 0 ? totalInvested / shares : 0;

  const handleStart = useCallback(() => {
    setState((s) => ({ ...s, isPlaying: true }));
  }, []);

  const handleBuy = useCallback(
    (amount: BuyAmount) => {
      if (cash < amount || isPaused || gameOver) return;
      const sharesToBuy = Math.floor(amount / fillPrice);
      if (sharesToBuy <= 0) return;

      const cost = sharesToBuy * fillPrice;
      setState((prev) => ({
        ...prev,
        cash: prev.cash - cost,
        shares: prev.shares + sharesToBuy,
        totalInvested: prev.totalInvested + cost,
        totalTrades: prev.totalTrades + 1,
      }));

      setShowTradeFlash({ type: 'buy', amount: sharesToBuy, price: fillPrice });
      setTimeout(() => setShowTradeFlash(null), 800);
    },
    [cash, fillPrice, isPaused, gameOver]
  );

  const handleSell = useCallback(
    (amount: SellAmount) => {
      if (shares === 0 || isPaused || gameOver) return;

      let sharesToSell: number;
      if (amount === 'all') {
        sharesToSell = shares;
      } else if (amount === 'half') {
        sharesToSell = Math.floor(shares / 2);
      } else {
        sharesToSell = Math.min(Math.floor(amount / fillPrice), shares);
      }

      if (sharesToSell <= 0) return;

      const proceeds = sharesToSell * fillPrice;
      const costBasis = (totalInvested / shares) * sharesToSell;
      const profit = proceeds - costBasis;

      setState((prev) => ({
        ...prev,
        cash: prev.cash + proceeds,
        shares: prev.shares - sharesToSell,
        totalInvested: amount === 'all' ? 0 : prev.totalInvested - costBasis,
        totalTrades: prev.totalTrades + 1,
      }));

      if (profit > 0) {
        setLastSellProfit(profit);
        setShowProfitFlash(true);
        setTimeout(() => setShowProfitFlash(false), 1500);
      }

      setShowTradeFlash({ type: 'sell', amount: sharesToSell, price: fillPrice });
      setTimeout(() => setShowTradeFlash(null), 800);
    },
    [shares, totalInvested, fillPrice, isPaused, gameOver]
  );

  useEffect(() => {
    if (!isPlaying || isPaused || gameOver) return;

    const intervalId = setInterval(() => {
      setState((s) => {
        const nextIndex = s.currentCandleIndex + 1;
        const nextCandle = s.candles[nextIndex];

        if (!nextCandle) {
          return { ...s, gameOver: true, isPlaying: false };
        }

        const isLastCandle = nextIndex >= s.candles.length - 1;
        const finalValue =
          s.cash +
          s.shares * (isLastCandle ? nextCandle.close : nextCandle.open);

        if (isLastCandle) {
          setTimeout(() => {
            router.push(
              `/results?finalValue=${finalValue}&profitLoss=${finalValue - STARTING_CASH}&totalTrades=${s.totalTrades}`
            );
          }, 100);
        }

        return {
          ...s,
          currentCandleIndex: nextIndex,
          gameOver: isLastCandle,
          isPlaying: !isLastCandle,
        };
      });
    }, tickIntervalMs);

    return () => clearInterval(intervalId);
  }, [isPlaying, isPaused, gameOver, tickIntervalMs]);

  const formatCurrency = (value: number) =>
    `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const chartHeight = Math.floor(Dimensions.get('window').height * 0.60);

  if (!isPlaying && currentCandleIndex === 0 && !gameOver) {
    return (
      <View style={[styles.container, styles.startContainer]}>
        <Text style={styles.startTitle}>
          <Text style={styles.titleCandle}>CANDLE </Text>
          <Text style={styles.titleClash}>CLASH</Text>
        </Text>
        <Text style={styles.startSubtitle}>
          {candleData.ticker} • {candleData.date} • {state.candles.length} candles
        </Text>
        <TouchableOpacity
          style={[styles.startButton, pendingGlow]}
          onPress={handleStart}
        >
          <Text style={styles.startButtonText}>Start Match</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.topRow}>
          <View style={styles.tickerSection}>
            <Text style={styles.ticker}>{candleData.ticker}</Text>
            <Text style={styles.divider}>|</Text>
            <Text style={styles.candleCount}>
              Candle {currentCandleIndex + 1}/{state.candles.length}
            </Text>
          </View>
          <View style={styles.portfolioSection}>
            <Text style={styles.portfolioLabel}>PORTFOLIO</Text>
            <Text style={styles.portfolioValue}>
              ${accountValue.toLocaleString()}
            </Text>
          </View>
        </View>
        <View style={styles.pnlHero}>
          <Text style={styles.pnlLabel}>P&L TODAY</Text>
          <View style={styles.pnlNumbers}>
            <Text
              style={
                profitLoss >= 0
                  ? styles.pnlValuePositive
                  : styles.pnlValueNegative
              }
            >
              {profitLoss >= 0 ? '+' : ''}${Math.abs(profitLoss).toLocaleString()}
            </Text>
            <Text
              style={
                profitLoss >= 0
                  ? styles.pnlPercentPositive
                  : styles.pnlPercentNegative
              }
            >
              {' '}({profitLoss >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%)
            </Text>
          </View>
        </View>
        {shares > 0 && (
          <View style={styles.positionRow}>
            <Text style={styles.positionInfo}>
              {shares} shares @ ${avgCost.toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.chartWrapper, styles.chartContainer]}>
        <Chart
          candles={state.candles}
          currentIndex={currentCandleIndex}
          height={chartHeight}
        />
      </View>

      {currentCandle && (
        <View style={styles.ohlcContainer}>
          <Text style={styles.ohlcText}>
            O: {formatCurrency(currentCandle.open)}  H: {formatCurrency(currentCandle.high)}  L: {formatCurrency(currentCandle.low)}  C: {formatCurrency(currentCandle.close)}
          </Text>
        </View>
      )}

      <View style={styles.controlsBar}>
        <View style={styles.speedControl}>
          <Text style={styles.controlLabel}>SPEED:</Text>
          {SPEED_OPTIONS.map((speed) => (
            <TouchableOpacity
              key={speed.value}
              style={[
                styles.controlButton,
                tickIntervalMs === speed.value && styles.controlButtonActive,
              ]}
              onPress={() =>
                setState((prev) => ({ ...prev, tickIntervalMs: speed.value }))
              }
            >
              <Text
                style={[
                  styles.controlButtonText,
                  tickIntervalMs === speed.value &&
                    styles.controlButtonTextActive,
                ]}
              >
                {speed.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.dividerVertical} />
        <View style={styles.timeframeControl}>
          <Text style={styles.controlLabel}>TF:</Text>
          {[
            { label: '5m', value: '5min' as const },
            { label: '15m', value: '15min' as const },
          ].map((tf) => (
            <TouchableOpacity
              key={tf.value}
              style={[
                styles.controlButton,
                timeframe === tf.value && styles.controlButtonActive,
              ]}
              onPress={() => {
                if (tf.value === timeframe) return;
                handleTimeframeChange(tf.value);
              }}
            >
              <Text
                style={[
                  styles.controlButtonText,
                  timeframe === tf.value && styles.controlButtonTextActive,
                ]}
              >
                {tf.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.dividerVertical} />
        <TouchableOpacity
          style={styles.pauseButton}
          onPress={() =>
            setState((prev) => ({ ...prev, isPaused: !prev.isPaused }))
          }
        >
          <Text style={styles.pauseButtonText}>{isPaused ? '▶' : '⏸'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <Text style={styles.actionLabel}>BUY</Text>
        <View style={styles.buttonRow}>
          {BUY_AMOUNTS.map((amount) => (
            <TouchableOpacity
              key={amount}
              style={[
                styles.buyButton,
                (isPaused || cash < amount || gameOver) && styles.disabledButton,
              ]}
              onPress={() => handleBuy(amount)}
              disabled={isPaused || cash < amount || gameOver}
            >
              <Text style={styles.buttonText}>${amount / 1000}K</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.actionLabel}>SELL</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.sellButton,
              (isPaused || shares === 0 || gameOver) && styles.disabledButton,
            ]}
            onPress={() => handleSell(5000)}
            disabled={isPaused || shares === 0 || gameOver}
          >
            <Text style={styles.buttonText}>$5K</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sellButton,
              (isPaused || shares === 0 || gameOver) && styles.disabledButton,
            ]}
            onPress={() => handleSell(10000)}
            disabled={isPaused || shares === 0 || gameOver}
          >
            <Text style={styles.buttonText}>$10K</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sellHalfButton,
              (isPaused || shares === 0 || gameOver) && styles.disabledButton,
            ]}
            onPress={() => handleSell('half')}
            disabled={isPaused || shares === 0 || gameOver}
          >
            <Text style={styles.buttonText}>HALF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sellAllButton,
              (isPaused || shares === 0 || gameOver) && styles.disabledButton,
            ]}
            onPress={() => handleSell('all')}
            disabled={isPaused || shares === 0 || gameOver}
          >
            <Text style={styles.buttonText}>ALL</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showTradeFlash && (
        <View style={styles.tradeFlash} pointerEvents="none">
          <View style={styles.tradeFlashInner}>
            <Text style={styles.tradeFlashText}>
              {showTradeFlash.type === 'buy' ? '📈 BUY' : '📉 SELL'} EXECUTED
            </Text>
            <Text style={styles.tradeFlashDetails}>
              {showTradeFlash.amount} shares @ ${showTradeFlash.price.toFixed(2)}
            </Text>
          </View>
        </View>
      )}

      {showProfitFlash && (
        <View style={styles.profitFlash} pointerEvents="none">
          <Text style={styles.profitFlashText}>💰 PROFIT LOCKED! 💰</Text>
          <Text style={styles.profitFlashAmount}>
            +${lastSellProfit.toLocaleString()}
          </Text>
        </View>
      )}

      {isSwitchingTimeframe && switchingToTimeframe && (
        <View style={styles.switchingOverlay} pointerEvents="none">
          <Text style={styles.switchingText}>
            Switching to {switchingToTimeframe}...
          </Text>
        </View>
      )}

      {isPaused && (
        <TouchableOpacity
          style={styles.pauseOverlay}
          activeOpacity={1}
          onPress={() =>
            setState((prev) => ({ ...prev, isPaused: !prev.isPaused }))
          }
        >
          <Text style={styles.pauseText}>⏸ PAUSED</Text>
          <Text style={styles.pauseSubtext}>Tap to resume</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  startContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0A0A0A',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tickerSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  portfolioSection: {
    alignItems: 'flex-end',
  },
  portfolioLabel: {
    fontSize: 9,
    color: '#00E5FF',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  portfolioValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  ticker: {
    fontSize: 20,
    fontWeight: '900',
    color: '#00E5FF',
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0, 229, 255, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
      },
    }),
  },
  divider: {
    color: '#666',
    marginHorizontal: 8,
    fontSize: 14,
  },
  candleCount: {
    fontSize: 14,
    color: '#A0A0A0',
  },
  pnlHero: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
    marginVertical: 8,
  },
  pnlNumbers: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  positionRow: {
    alignItems: 'center',
    marginTop: 6,
  },
  pnlLabel: {
    fontSize: 10,
    color: '#00E5FF',
    letterSpacing: 1,
    fontWeight: '600',
  },
  pnlValuePositive: {
    fontSize: 32,
    fontWeight: '900',
    color: '#00E5FF',
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0, 229, 255, 0.4)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 6,
      },
    }),
  },
  pnlValueNegative: {
    fontSize: 32,
    fontWeight: '900',
    color: '#EF4444',
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(239, 68, 68, 0.4)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 6,
      },
    }),
  },
  pnlPercentPositive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00E5FF',
  },
  pnlPercentNegative: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  positionInfo: {
    fontSize: 11,
    color: '#A0A0A0',
  },
  startTitle: {
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
  },
  titleCandle: {
    color: '#FFFFFF',
  },
  titleClash: {
    color: '#00E5FF',
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0, 229, 255, 0.6)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 12,
      },
    }),
  },
  startSubtitle: {
    fontSize: 16,
    color: '#A0A0A0',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  startButton: {
    backgroundColor: '#A855F7',
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 12,
    alignSelf: 'center',
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  chartWrapper: {
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chartContainer: {
    flex: 1,
    minHeight: 200,
    marginBottom: 4,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.15)',
    borderRadius: 8,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#00E5FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  ohlcContainer: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 229, 255, 0.3)',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 229, 255, 0.03)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 229, 255, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 229, 255, 0.1)',
  },
  speedControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeframeControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 9,
    color: '#00E5FF',
    marginRight: 6,
    fontWeight: '600',
  },
  controlButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 3,
    minWidth: 32,
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#A855F7',
  },
  controlButtonText: {
    fontSize: 11,
    color: '#A0A0A0',
    fontWeight: '600',
  },
  controlButtonTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  dividerVertical: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
    marginHorizontal: 12,
  },
  pauseButton: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#00E5FF',
  },
  pauseButtonText: {
    color: '#00E5FF',
    fontSize: 16,
    fontWeight: '700',
  },
  ohlcText: {
    fontSize: 12,
    color: '#888',
  },
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
    backgroundColor: '#0A0A0A',
  },
  actionLabel: {
    fontSize: 10,
    color: '#00E5FF',
    letterSpacing: 1,
    marginBottom: 4,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  buyButton: {
    flex: 1,
    backgroundColor: '#10B981',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  sellButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  sellHalfButton: {
    flex: 1,
    backgroundColor: '#A855F7',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#A855F7',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  sellAllButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
      },
      android: { elevation: 10 },
    }),
  },
  disabledButton: {
    opacity: 0.3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  tradeFlash: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  tradeFlashInner: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00E5FF',
  },
  tradeFlashText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#00E5FF',
  },
  tradeFlashDetails: {
    fontSize: 14,
    color: '#A0A0A0',
    marginTop: 4,
  },
  profitFlash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  profitFlashText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#00E5FF',
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0, 229, 255, 0.8)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 12,
      },
    }),
  },
  profitFlashAmount: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    marginTop: 8,
    ...Platform.select({
      ios: {
        textShadowColor: '#00E5FF',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
      },
    }),
  },
  pauseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  pauseText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#00E5FF',
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0, 229, 255, 0.6)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 12,
      },
    }),
  },
  pauseSubtext: {
    fontSize: 16,
    color: '#A0A0A0',
    marginTop: 12,
  },
  switchingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 998,
  },
  switchingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00E5FF',
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0, 229, 255, 0.6)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
      },
    }),
  },
});

import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

export default function ResultsScreen() {
  const params = useLocalSearchParams<{
    finalValue?: string;
    profitLoss?: string;
    totalTrades?: string;
  }>();

  const finalValue = params.finalValue ? parseFloat(params.finalValue) : 0;
  const profitLoss = params.profitLoss ? parseFloat(params.profitLoss) : 0;
  const totalTrades = params.totalTrades ? parseInt(params.totalTrades, 10) : 0;

  const isWinner = profitLoss > 0;

  const formatCurrency = (value: number) =>
    `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const purpleGlow = Platform.select({
    ios: {
      shadowColor: '#A855F7',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 16,
    },
    android: { elevation: 12 },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Game Over</Text>

      {isWinner && (
        <Text style={styles.badge}>🏆 Winner</Text>
      )}

      <View style={styles.stats}>
        <Text style={styles.label}>Final Account Value</Text>
        <Text style={styles.finalValue}>{formatCurrency(finalValue)}</Text>

        <Text style={styles.label}>P&L</Text>
        <Text
          style={[
            styles.profitLoss,
            profitLoss >= 0 ? styles.profit : styles.loss,
          ]}
        >
          {formatCurrency(profitLoss)}
        </Text>

        <Text style={styles.label}>Total Trades</Text>
        <Text style={styles.tradesCount}>{totalTrades}</Text>
      </View>

      <TouchableOpacity
        style={[styles.playAgainButton, purpleGlow]}
        onPress={() => router.replace('/game')}
      >
        <Text style={styles.playAgainText}>Play Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  badge: {
    fontSize: 24,
    fontWeight: '900',
    color: '#10B981',
    marginBottom: 32,
  },
  stats: {
    alignItems: 'center',
    marginBottom: 40,
  },
  label: {
    fontSize: 14,
    color: '#A0A0A0',
    marginTop: 16,
    marginBottom: 4,
  },
  finalValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  profitLoss: {
    fontSize: 24,
    fontWeight: '900',
  },
  profit: {
    color: '#00E5FF',
  },
  loss: {
    color: '#EF4444',
  },
  tradesCount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  playAgainButton: {
    backgroundColor: '#A855F7',
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 12,
  },
  playAgainText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});

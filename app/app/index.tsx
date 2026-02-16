import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Logo } from '../components/Logo';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.backgroundPattern} />
      <View style={styles.content}>
        <Logo width={400} height={160} />
        <Text style={styles.subtitle}>
          Buy right. Sell smart. Beat the chart.
        </Text>

        <TouchableOpacity
          style={styles.playButton}
          onPress={() => router.push('/game')}
          activeOpacity={0.8}
        >
          <Text style={styles.playButtonText}>▶ PLAY SOLO</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.multiplayerButton}
          onPress={() => {
            Alert.alert(
              '🎮 Multiplayer Mode',
              'Race against friends in real-time!\n\nComing soon...',
              [{ text: 'Got it!', style: 'default' }]
            );
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.multiplayerButtonText}>👥 MULTIPLAYER</Text>
          <Text style={styles.comingSoonBadge}>SOON</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0A0A0A',
    borderWidth: 2,
    borderColor: 'rgba(0, 229, 255, 0.15)',
    borderRadius: 0,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#A0A0A0',
    marginTop: 16,
    marginBottom: 60,
    textAlign: 'center',
  },
  playButton: {
    backgroundColor: '#A855F7',
    paddingHorizontal: 60,
    paddingVertical: 20,
    borderRadius: 12,
    minWidth: 280,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#A855F7',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
      },
      android: { elevation: 12 },
    }),
  },
  playButtonText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
  },
  multiplayerButton: {
    marginTop: 20,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#00E5FF',
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 280,
    justifyContent: 'center',
  },
  multiplayerButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00E5FF',
    marginRight: 12,
  },
  comingSoonBadge: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
    backgroundColor: '#00E5FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
});

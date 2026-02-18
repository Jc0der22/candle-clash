import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A0A0A' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="game" />
      <Stack.Screen name="results" />
    </Stack>
  );
}

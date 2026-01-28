import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTintColor: '#111827',
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: '#f9fafb',
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="pet/[id]" options={{ title: 'Pet Details' }} />
        <Stack.Screen name="auth/login" options={{ title: 'Sign In', presentation: 'modal' }} />
        <Stack.Screen name="auth/signup" options={{ title: 'Sign Up', presentation: 'modal' }} />
      </Stack>
    </AuthProvider>
  );
}

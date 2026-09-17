import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ArtisanProvider, useArtisan } from './context/ArtisanContext';
import RootNavigator from './navigation/RootNavigator';
import { COLORS } from './theme/theme';

function SplashGate({ children }) {
  const { isLoading } = useArtisan();
  if (isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }
  return children;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ArtisanProvider>
        <StatusBar style="dark" backgroundColor={COLORS.background} />
        <SplashGate>
          <RootNavigator />
        </SplashGate>
      </ArtisanProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
});

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ArtisanContext = createContext(undefined);

const STORAGE_KEY = '@kalasetu_artisan_session';

export function ArtisanProvider({ children }) {
  const [artisan, setArtisan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setArtisan(JSON.parse(stored));
        }
      } catch (err) {
        console.warn('[KalaSetu] Failed to load stored session:', err.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (artisanData) => {
    setArtisan(artisanData);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(artisanData));
  }, []);

  const signOut = useCallback(async () => {
    setArtisan(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ artisan, isLoading, signIn, signOut, isAuthenticated: Boolean(artisan) }),
    [artisan, isLoading, signIn, signOut]
  );

  return <ArtisanContext.Provider value={value}>{children}</ArtisanContext.Provider>;
}

export function useArtisan() {
  const ctx = useContext(ArtisanContext);
  if (!ctx) {
    throw new Error('useArtisan must be used within an ArtisanProvider');
  }
  return ctx;
}

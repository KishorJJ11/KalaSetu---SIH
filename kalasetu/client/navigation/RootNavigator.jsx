import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useArtisan } from '../context/ArtisanContext';
import { COLORS } from '../theme/theme';

import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import StudioCameraScreen from '../screens/StudioCameraScreen';
import SmartPricingScreen from '../screens/SmartPricingScreen';
import CatalogScreen from '../screens/CatalogScreen';
import BuyerCatalogPreview from '../screens/BuyerCatalogPreview';
import ChatScreen from '../screens/ChatScreen';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: COLORS.backgroundWarm },
  animation: 'slide_from_right',
};

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useArtisan();

  if (isLoading) {
    return null; // App.jsx shows a splash indicator while session loads
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="StudioCamera" component={StudioCameraScreen} />
            <Stack.Screen name="SmartPricing" component={SmartPricingScreen} />
            <Stack.Screen name="Catalog" component={CatalogScreen} />
            <Stack.Screen name="BuyerPreview" component={BuyerCatalogPreview} />
            <Stack.Screen name="ChatScreen" component={ChatScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

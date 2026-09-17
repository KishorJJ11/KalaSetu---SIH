import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import PrimaryButton from '../components/PrimaryButton';
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from '../theme/theme';
import { loginArtisan } from '../utils/api';
import { useArtisan } from '../context/ArtisanContext';

export default function LoginScreen() {
  const navigation = useNavigation();
  const { signIn } = useArtisan();

  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = /^[6-9]\d{9}$/.test(phone.trim());

  const handleLogin = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await loginArtisan(phone.trim());
      await signIn(res.data);
    } catch (err) {
      const message = err?.response?.data?.message || 'Login failed. Please try again.';
      Alert.alert('Login Failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brandRow}>
            <View style={styles.logoCircle}>
              <Ionicons name="color-palette" size={30} color={COLORS.textOnPrimary} />
            </View>
            <Text style={styles.brandTitle}>Welcome Back</Text>
            <Text style={styles.brandSubtitle}>Login to KalaSetu</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Enter your mobile number</Text>
            <Text style={styles.cardHint}>We will log you into your existing artisan account.</Text>

            <Text style={styles.label}>Mobile Number</Text>
            <View style={styles.phoneRow}>
              <Text style={styles.phonePrefix}>+91</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="98765 43210"
                placeholderTextColor={COLORS.textSecondary}
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, '').slice(0, 10))}
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>

            <PrimaryButton
              label="Login"
              icon="log-in-outline"
              disabled={!canSubmit}
              loading={submitting}
              onPress={handleLogin}
              style={{ marginTop: SPACING.lg }}
            />
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <PrimaryButton
              label="Register here"
              variant="text"
              fullWidth={false}
              onPress={() => navigation.navigate('Onboarding')}
              textStyle={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.bold }}
              style={{ paddingHorizontal: 0, height: 'auto' }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.backgroundWarm,
  },
  scroll: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  brandRow: {
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    ...SHADOW.button,
  },
  brandTitle: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.black,
    color: COLORS.textPrimary,
  },
  brandSubtitle: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    ...SHADOW.card,
  },
  cardTitle: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  cardHint: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.backgroundWarm,
    paddingHorizontal: SPACING.md,
  },
  phonePrefix: {
    fontSize: FONT.size.base,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
  },
  phoneInput: {
    flex: 1,
    minHeight: 52,
    fontSize: FONT.size.base,
    color: COLORS.textPrimary,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  footerText: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  }
});

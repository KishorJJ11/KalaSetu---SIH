import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import PrimaryButton from '../components/PrimaryButton';
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from '../theme/theme';
import { CRAFT_CATEGORIES, INDIAN_STATES, SKILL_LEVELS } from '../utils/constants';
import { registerArtisan } from '../utils/api';
import { useArtisan } from '../context/ArtisanContext';

export default function OnboardingScreen() {
  const navigation = useNavigation();
  const { signIn } = useArtisan();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [craftCategory, setCraftCategory] = useState('');
  const [skillLevel, setSkillLevel] = useState('skilled');
  const [state, setState] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canContinueStep1 = name.trim().length >= 2 && /^[6-9]\d{9}$/.test(phone.trim());
  const canContinueStep2 = Boolean(craftCategory) && Boolean(skillLevel);
  const canSubmit = Boolean(state);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await registerArtisan({
        name: name.trim(),
        phone: phone.trim(),
        craftCategory,
        skillLevel,
        state,
      });
      await signIn(res.data);
    } catch (err) {
      const message = err?.response?.data?.message || 'Registration failed. Please try again.';
      Alert.alert('Could not register', message);
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
            <Text style={styles.brandTitle}>KalaSetu</Text>
            <Text style={styles.brandSubtitle}>कला सेतु · CraftBridge</Text>
          </View>

          <View style={styles.stepIndicatorRow}>
            {[1, 2, 3].map((s) => (
              <View
                key={s}
                style={[styles.stepDot, s <= step && styles.stepDotActive]}
              />
            ))}
          </View>

          {step === 1 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Let's get started</Text>
              <Text style={styles.cardHint}>Tell us your name and phone number</Text>

              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Lakshmi Devi"
                placeholderTextColor={COLORS.textSecondary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

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
                label="Continue"
                icon="arrow-forward"
                disabled={!canContinueStep1}
                onPress={() => setStep(2)}
                style={{ marginTop: SPACING.lg }}
              />
            </View>
          )}

          {step === 1 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: SPACING.xl }}>
              <Text style={{ fontSize: FONT.size.sm, color: COLORS.textSecondary }}>Already have an account? </Text>
              <PrimaryButton
                label="Login here"
                variant="text"
                fullWidth={false}
                onPress={() => navigation.navigate('Login')}
                textStyle={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.bold }}
                style={{ paddingHorizontal: 0, height: 'auto' }}
              />
            </View>
          )}

          {step === 2 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your craft</Text>
              <Text style={styles.cardHint}>What do you make, and how experienced are you?</Text>

              <Text style={styles.label}>Craft Category</Text>
              <View style={styles.chipGrid}>
                {CRAFT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[styles.chip, craftCategory === cat.value && styles.chipActive]}
                    onPress={() => setCraftCategory(cat.value)}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name={cat.icon}
                      size={18}
                      color={craftCategory === cat.value ? COLORS.textOnPrimary : COLORS.primary}
                      style={{ marginRight: SPACING.xs }}
                    />
                    <Text
                      style={[styles.chipLabel, craftCategory === cat.value && styles.chipLabelActive]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Skill Level</Text>
              <View style={styles.chipGrid}>
                {SKILL_LEVELS.map((lvl) => (
                  <TouchableOpacity
                    key={lvl.value}
                    style={[styles.chip, skillLevel === lvl.value && styles.chipActive]}
                    onPress={() => setSkillLevel(lvl.value)}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[styles.chipLabel, skillLevel === lvl.value && styles.chipLabelActive]}
                    >
                      {lvl.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.buttonRow}>
                <PrimaryButton
                  label="Back"
                  variant="outline"
                  onPress={() => setStep(1)}
                  fullWidth={false}
                  style={{ flex: 1, marginRight: SPACING.sm }}
                />
                <PrimaryButton
                  label="Continue"
                  icon="arrow-forward"
                  disabled={!canContinueStep2}
                  onPress={() => setStep(3)}
                  fullWidth={false}
                  style={{ flex: 1, marginLeft: SPACING.sm }}
                />
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Where are you based?</Text>
              <Text style={styles.cardHint}>This helps buyers discover craft from your region</Text>

              <Text style={styles.label}>State</Text>
              <View style={styles.chipGrid}>
                {INDIAN_STATES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, state === s && styles.chipActive]}
                    onPress={() => setState(s)}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.chipLabel, state === s && styles.chipLabelActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.buttonRow}>
                <PrimaryButton
                  label="Back"
                  variant="outline"
                  onPress={() => setStep(2)}
                  fullWidth={false}
                  style={{ flex: 1, marginRight: SPACING.sm }}
                />
                <PrimaryButton
                  label="Finish"
                  icon="checkmark"
                  disabled={!canSubmit}
                  loading={submitting}
                  onPress={handleSubmit}
                  fullWidth={false}
                  style={{ flex: 1, marginLeft: SPACING.sm }}
                />
              </View>
            </View>
          )}
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
    marginBottom: SPACING.lg,
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
  stepIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  stepDot: {
    width: 32,
    height: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
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
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    fontSize: FONT.size.base,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.backgroundWarm,
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
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.backgroundWarm,
    minHeight: 44,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipLabel: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.medium,
    color: COLORS.textPrimary,
  },
  chipLabelActive: {
    color: COLORS.textOnPrimary,
    fontWeight: FONT.weight.bold,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
  },
});

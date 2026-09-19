import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import ScreenHeader from '../components/ScreenHeader';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from '../theme/theme';
import { CRAFT_CATEGORIES, SKILL_LEVELS, formatINR } from '../utils/constants';
import { checkPrice, createProduct } from '../utils/api';
import { useArtisan } from '../context/ArtisanContext';

const DEBOUNCE_MS = 450;

export default function SmartPricingScreen({ route, navigation }) {
  const { imageAssets } = route.params || {};
  const { artisan } = useArtisan();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(artisan?.craftCategory || 'other');
  const [skillLevel, setSkillLevel] = useState(artisan?.skillLevel || 'skilled');
  const [rawMaterialCost, setRawMaterialCost] = useState(200);
  const [hoursSpent, setHoursSpent] = useState(6);
  const [weightOrSize, setWeightOrSize] = useState(1);

  const [pricing, setPricing] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [customPrice, setCustomPrice] = useState('');

  const artisanId = artisan?._id || artisan?.id;
  const isCustom = selectedPrice === 'custom';
  const finalPriceValue = isCustom ? Number(customPrice) : selectedPrice;
  const canPublish = title.trim().length >= 2 && Boolean(pricing) && !publishing && (finalPriceValue > 0);

  useEffect(() => {
    setLoadingPrice(true);
    const timer = setTimeout(async () => {
      try {
        const res = await checkPrice({
          category,
          rawMaterialCost,
          hoursSpent,
          skillLevel,
          weightOrSize,
        });
        setPricing(res.data);
        if (res.data?.pricePoints?.recommendedMarketPrice) {
          setSelectedPrice(res.data.pricePoints.recommendedMarketPrice);
        }
      } catch (err) {
        console.warn('[KalaSetu] Price check failed:', err.message);
      } finally {
        setLoadingPrice(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [category, rawMaterialCost, hoursSpent, skillLevel, weightOrSize]);

  const selectedCategory = useMemo(
    () => CRAFT_CATEGORIES.find((c) => c.value === category) || CRAFT_CATEGORIES[0],
    [category]
  );

  const handlePublish = async () => {
    if (!canPublish || !artisanId) return;
    setPublishing(true);
    try {
      await createProduct({
        artisanId,
        title: title.trim(),
        description: `${selectedCategory.label} handcrafted by ${artisan.name}`,
        category,
        rawCost: rawMaterialCost,
        laborHours: hoursSpent,
        weightOrSize,
        skillLevel,
        imageAssets,
        finalPrice: finalPriceValue,
      });
      Alert.alert('Published! 🎉', 'Your craft is now live in your catalog.', [
        {
          text: 'View Catalog',
          onPress: () => navigation.navigate('Catalog'),
        },
      ]);
    } catch (err) {
      console.error('[KalaSetu] Publish Error:', err);
      console.error('[KalaSetu] Publish Error Message:', err.message);
      if (err.response) {
        console.error('[KalaSetu] Publish Error Response Data:', err.response.data);
      }
      const message = err?.response?.data?.message || err.message || 'Could not publish this product. Please try again.';
      Alert.alert('Publish failed', message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScreenHeader title="Smart Pricing" subtitle="AI-suggested fair pricing" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Product Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Hand-thrown Terracotta Vase"
          placeholderTextColor={COLORS.textSecondary}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.sm }}>
          {CRAFT_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[styles.chip, category === cat.value && styles.chipActive]}
              onPress={() => setCategory(cat.value)}
            >
              <Ionicons
                name={cat.icon}
                size={16}
                color={category === cat.value ? COLORS.textOnPrimary : COLORS.primary}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.chipLabel, category === cat.value && styles.chipLabelActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Skill Level</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
          {SKILL_LEVELS.map((lvl) => (
            <TouchableOpacity
              key={lvl.value}
              style={[styles.chip, skillLevel === lvl.value && styles.chipActive]}
              onPress={() => setSkillLevel(lvl.value)}
            >
              <Text style={[styles.chipLabel, skillLevel === lvl.value && styles.chipLabelActive]}>
                {lvl.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <SliderRow
          label="Raw Material Cost"
          value={rawMaterialCost}
          onChange={setRawMaterialCost}
          min={0}
          max={5000}
          step={10}
          displayValue={formatINR(rawMaterialCost)}
        />
        <SliderRow
          label="Crafting Hours"
          value={hoursSpent}
          onChange={setHoursSpent}
          min={0}
          max={80}
          step={0.5}
          displayValue={`${hoursSpent} hrs`}
        />
        <SliderRow
          label="Weight / Size (kg or relative scale)"
          value={weightOrSize}
          onChange={setWeightOrSize}
          min={0.1}
          max={10}
          step={0.1}
          displayValue={`${weightOrSize.toFixed(1)}`}
        />

        <View style={styles.priceCard}>
          <View style={styles.priceCardHeader}>
            <Ionicons name="sparkles" size={20} color={COLORS.primary} />
            <Text style={styles.priceCardTitle}>AI Suggested Price</Text>
            {loadingPrice && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: SPACING.sm }} />}
          </View>

          {pricing ? (
            <>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Material Cost</Text>
                <Text style={styles.breakdownValue}>{formatINR(pricing.breakdown.materialCost)}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Fair Artisan Wage</Text>
                <Text style={styles.breakdownValue}>{formatINR(pricing.breakdown.fairArtisanWage)}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Retail Benchmark Margin</Text>
                <Text style={styles.breakdownValue}>{pricing.breakdown.marginAppliedPercent}%</Text>
              </View>

              <View style={styles.divider} />

              <PricePointCard
                label="Minimum Price"
                value={pricing.pricePoints.suggestedMinimumPrice}
                tone="warning"
                selected={selectedPrice === pricing.pricePoints.suggestedMinimumPrice}
                onPress={() => setSelectedPrice(pricing.pricePoints.suggestedMinimumPrice)}
              />
              <PricePointCard
                label="Recommended Market Price"
                value={pricing.pricePoints.recommendedMarketPrice}
                tone="primary"
                highlighted
                selected={selectedPrice === pricing.pricePoints.recommendedMarketPrice}
                onPress={() => setSelectedPrice(pricing.pricePoints.recommendedMarketPrice)}
              />
              <PricePointCard
                label="Festival / High-Demand Price"
                value={pricing.pricePoints.highDemandFestivalPrice}
                tone="success"
                selected={selectedPrice === pricing.pricePoints.highDemandFestivalPrice}
                onPress={() => setSelectedPrice(pricing.pricePoints.highDemandFestivalPrice)}
              />

              <View style={styles.customPriceWrap}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSelectedPrice('custom')}
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs }}
                >
                  <Ionicons
                    name={isCustom ? "radio-button-on" : "radio-button-off"}
                    size={24}
                    color={isCustom ? COLORS.primary : COLORS.textSecondary}
                  />
                  <Text style={[styles.pricePointLabel, { marginLeft: SPACING.sm, color: isCustom ? COLORS.primary : COLORS.textPrimary }]}>
                    Set Custom Price
                  </Text>
                </TouchableOpacity>
                {isCustom && (
                  <TextInput
                    style={[styles.input, { marginTop: SPACING.xs, marginBottom: 0 }]}
                    placeholder="Enter custom price (₹)"
                    keyboardType="numeric"
                    value={customPrice}
                    onChangeText={setCustomPrice}
                  />
                )}
              </View>

              <Text style={styles.rationaleText}>{pricing.rationale.recommendedMarket}</Text>
            </>
          ) : (
            <View style={{ paddingVertical: SPACING.lg, alignItems: 'center' }}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          )}
        </View>

        <PrimaryButton
          label={publishing ? 'Publishing…' : 'Publish to Catalog'}
          icon="checkmark-circle"
          onPress={handlePublish}
          disabled={!canPublish}
          loading={publishing}
          style={{ marginTop: SPACING.lg }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function SliderRow({ label, value, onChange, min, max, step, displayValue }) {
  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderLabelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.sliderValue}>{displayValue}</Text>
      </View>
      <Slider
        style={{ width: '100%', height: 40 }}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={COLORS.primary}
        maximumTrackTintColor={COLORS.border}
        thumbTintColor={COLORS.primary}
      />
    </View>
  );
}

function PricePointCard({ label, value, tone, highlighted, selected, onPress }) {
  const toneColors = {
    warning: { bg: COLORS.warningLight, text: COLORS.warning },
    primary: { bg: '#FFF3E0', text: COLORS.primary },
    success: { bg: COLORS.successLight, text: COLORS.success },
  }[tone];

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.pricePointRow,
        { backgroundColor: selected ? toneColors.bg : COLORS.surface },
        highlighted && styles.pricePointHighlighted,
        selected && { borderColor: toneColors.text, borderWidth: 2 }
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.pricePointLabel, { color: selected ? toneColors.text : COLORS.textPrimary }]}>{label}</Text>
        <Text style={[styles.pricePointValue, { color: selected ? toneColors.text : COLORS.textPrimary }]}>{formatINR(value)}</Text>
      </View>
      <Ionicons 
        name={selected ? "radio-button-on" : "radio-button-off"} 
        size={24} 
        color={selected ? toneColors.text : COLORS.textSecondary} 
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.backgroundWarm },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  label: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    fontSize: FONT.size.base,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.md,
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
    backgroundColor: COLORS.surface,
    minHeight: 40,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipLabel: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.medium,
    color: COLORS.textPrimary,
  },
  chipLabelActive: {
    color: COLORS.textOnPrimary,
    fontWeight: FONT.weight.bold,
  },
  sliderBlock: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderValue: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },
  priceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginTop: SPACING.sm,
    ...SHADOW.card,
  },
  priceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  priceCardTitle: {
    fontSize: FONT.size.base,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    marginLeft: SPACING.xs,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },
  breakdownValue: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  pricePointRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  pricePointHighlighted: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  pricePointLabel: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
  },
  pricePointValue: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.black,
  },
  rationaleText: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    lineHeight: 18,
  },
  customPriceWrap: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  }
});

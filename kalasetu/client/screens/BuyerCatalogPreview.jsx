import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import ScreenHeader from '../components/ScreenHeader';
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from '../theme/theme';
import { getMarketplaceFeed, placeBid } from '../utils/api';
import { CRAFT_CATEGORIES, categoryLabel, formatINR } from '../utils/constants';

export default function BuyerCatalogPreview({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const params = { sort: 'newest' };
      if (activeCategory) params.category = activeCategory;
      if (search.trim()) params.search = search.trim();
      const res = await getMarketplaceFeed(params);
      setProducts(res.data);
    } catch (err) {
      console.warn('[KalaSetu] Marketplace feed load failed:', err.message);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, search]);

  useEffect(() => {
    const timer = setTimeout(loadFeed, 400);
    return () => clearTimeout(timer);
  }, [loadFeed]);

  const handleBid = (item) => {
    Alert.prompt(
      'Place Bid',
      `Current highest bid is ${formatINR(item.currentHighestBid || item.finalPrice)}. Enter your bid amount:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Bid',
          onPress: async (amountStr) => {
            const amount = Number(amountStr);
            if (isNaN(amount) || amount <= (item.currentHighestBid || item.finalPrice)) {
              Alert.alert('Invalid Bid', 'Bid must be higher than the current highest bid.');
              return;
            }
            try {
              await placeBid(item.id, amount, 'Guest Buyer');
              Alert.alert('Success', 'Your bid has been placed!');
              loadFeed();
            } catch (err) {
              Alert.alert('Bid Failed', err.response?.data?.message || err.message);
            }
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const renderItem = ({ item }) => {
    const isAuction = item.isAuction;
    const isAuctionActive = item.auctionStatus === 'active';
    
    return (
      <View style={styles.card}>
      <View style={styles.imageWrap}>
        {item.images?.length > 0 || item.studioImageUrl ? (
          <>
            <Image source={{ uri: item.images?.[0]?.studioUrl || item.studioImageUrl }} style={styles.image} resizeMode="cover" />
            <TouchableOpacity 
              style={styles.arButton} 
              onPress={() => navigation.navigate('ARPreview', { imageUrl: item.images?.[0]?.studioUrl || item.studioImageUrl })}
            >
              <Ionicons name="scan-outline" size={14} color={COLORS.textOnPrimary} />
              <Text style={styles.arText}>View in AR</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="image-outline" size={26} color={COLORS.textSecondary} />
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardCategory}>{categoryLabel(item.category)}</Text>
        <View style={styles.artisanRow}>
          <Ionicons name="person-circle-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.artisanText} numberOfLines={1}>
            {item.artisan?.name} · {item.artisan?.state}
          </Text>
          {item.artisan?.isVerified && (
            <Ionicons name="checkmark-circle" size={13} color={COLORS.success} style={{ marginLeft: 4 }} />
          )}
        </View>

        {isAuction ? (
          <View style={{ marginTop: SPACING.xs }}>
            <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>
              {isAuctionActive ? 'Auction Active (Current Bid)' : 'Auction Ended (Final Bid)'}
            </Text>
            <Text style={styles.cardPrice}>{formatINR(item.currentHighestBid || item.finalPrice)}</Text>
            {isAuctionActive && (
              <TouchableOpacity style={styles.bidBtn} onPress={() => handleBid(item)}>
                <Text style={styles.bidBtnText}>Place Bid</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Text style={styles.cardPrice}>{formatINR(item.finalPrice)}</Text>
        )}
      </View>
    </View>
  );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Buyer Marketplace"
        subtitle="How customers see your craft"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search handcrafted products…"
          placeholderTextColor={COLORS.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ value: null, label: 'All' }, ...CRAFT_CATEGORIES]}
        keyExtractor={(item) => String(item.value)}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, activeCategory === item.value && styles.filterChipActive]}
            onPress={() => setActiveCategory(item.value)}
          >
            <Text
              style={[
                styles.filterChipLabel,
                activeCategory === item.value && styles.filterChipLabelActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.centerWrap}>
          <Ionicons name="storefront-outline" size={52} color={COLORS.border} />
          <Text style={styles.emptyTitle}>No listings found</Text>
          <Text style={styles.emptySub}>Try a different search or category</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ paddingHorizontal: SPACING.md, gap: SPACING.md }}
          contentContainerStyle={{ paddingVertical: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.backgroundWarm },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    minHeight: 46,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONT.size.sm,
    color: COLORS.textPrimary,
  },
  filterRow: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  filterChip: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.surface,
    minHeight: 36,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipLabel: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.medium,
    color: COLORS.textPrimary,
  },
  filterChipLabelActive: {
    color: COLORS.textOnPrimary,
    fontWeight: FONT.weight.bold,
  },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  emptyTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptySub: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOW.card,
  },
  imageWrap: { width: '100%', aspectRatio: 1, backgroundColor: COLORS.backgroundWarm, position: 'relative' },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  arButton: {
    position: 'absolute',
    bottom: SPACING.xs,
    right: SPACING.xs,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  arText: {
    color: COLORS.textOnPrimary,
    fontSize: 10,
    fontWeight: FONT.weight.bold,
    marginLeft: 4,
  },
  cardBody: { padding: SPACING.sm },
  cardTitle: { fontSize: FONT.size.sm, fontWeight: FONT.weight.bold, color: COLORS.textPrimary },
  cardCategory: { fontSize: FONT.size.xs, color: COLORS.textSecondary, marginTop: 2 },
  artisanRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  artisanText: { fontSize: 11, color: COLORS.textSecondary, marginLeft: 4, flexShrink: 1 },
  cardPrice: { fontSize: FONT.size.base, fontWeight: FONT.weight.black, color: COLORS.primary, marginTop: 4 },
  bidBtn: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  bidBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
  }
});

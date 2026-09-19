import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Sharing from 'expo-sharing';

import ScreenHeader from '../components/ScreenHeader';
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from '../theme/theme';
import { getArtisanCatalog, acceptAuctionBid } from '../utils/api';
import { categoryLabel, formatINR } from '../utils/constants';
import { useArtisan } from '../context/ArtisanContext';

const STATUS_META = {
  live: { label: 'Live', color: COLORS.success, bg: COLORS.successLight },
  draft: { label: 'Draft', color: COLORS.warning, bg: COLORS.warningLight },
  processing: { label: 'Processing', color: COLORS.info, bg: COLORS.infoLight },
  sold_out: { label: 'Sold Out', color: COLORS.error, bg: COLORS.errorLight },
  archived: { label: 'Archived', color: COLORS.textSecondary, bg: COLORS.backgroundWarm },
};

export default function CatalogScreen({ navigation }) {
  const { artisan } = useArtisan();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCatalog = useCallback(async () => {
    const artisanId = artisan?._id || artisan?.id;
    if (!artisanId) {
      setLoading(false);
      return;
    }
    try {
      const res = await getArtisanCatalog(artisanId);
      setProducts(res.data);
    } catch (err) {
      console.warn('[KalaSetu] Catalog load failed:', err.message);
    } finally {
      setLoading(false);
    }
  }, [artisan]);

  useFocusEffect(
    useCallback(() => {
      loadCatalog();
    }, [loadCatalog])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCatalog();
    setRefreshing(false);
  };

  const shareToWhatsApp = async (product) => {
    const text = `Check out "${product.title}" — handcrafted ${categoryLabel(product.category)} available for ${formatINR(
      product.finalPrice
    )} on KalaSetu! 🎨`;
    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else if ((product.images?.[0]?.studioUrl || product.studioImageUrl) && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(product.images?.[0]?.studioUrl || product.studioImageUrl);
      } else {
        Alert.alert('WhatsApp not found', 'Install WhatsApp to share this listing directly.');
      }
    } catch (err) {
      Alert.alert('Share failed', err.message);
    }
  };

  const exportToONDC = (product) => {
    Alert.alert(
      'ONDC Export (Simulated)',
      `"${product.title}" has been packaged in ONDC catalog schema format and queued for network publish. This is a hackathon demo simulation of the real ONDC seller-app integration.`
    );
  };

  const handleAcceptBid = async (product) => {
    if ((product.currentHighestBid || 0) <= 0) {
      Alert.alert('No Bids', 'There are no bids to accept yet.');
      return;
    }
    
    Alert.alert(
      'Accept Bid?',
      `Are you sure you want to accept the highest bid of ${formatINR(product.currentHighestBid)}? This will end the auction and mark the item as Sold Out.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await acceptAuctionBid(product._id || product.id);
              Alert.alert('Success', 'Bid accepted! Product is now Sold Out.');
              loadCatalog();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || err.message);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => {
    const statusMeta = STATUS_META[item.status] || STATUS_META.draft;
    const isAuction = item.isAuction;
    const isAuctionActive = item.auctionStatus === 'active';
    return (
      <View style={styles.card}>
        <View style={styles.imageWrap}>
          {item.images?.length > 0 || item.studioImageUrl ? (
            <Image source={{ uri: item.images?.[0]?.studioUrl || item.studioImageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Ionicons name="image-outline" size={28} color={COLORS.textSecondary} />
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.cardCategory}>{categoryLabel(item.category)}</Text>
          
          {isAuction ? (
            <View style={{ marginTop: SPACING.xs }}>
              <Text style={{ fontSize: 10, color: COLORS.textSecondary }}>
                {isAuctionActive ? 'Current Highest Bid' : 'Auction Final Bid'}
              </Text>
              <Text style={styles.cardPrice}>{formatINR(item.currentHighestBid || item.finalPrice)}</Text>
              {isAuctionActive && (
                <TouchableOpacity 
                  style={styles.acceptBtn} 
                  onPress={() => handleAcceptBid(item)}
                >
                  <Text style={styles.acceptBtnText}>Accept Bid</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <Text style={styles.cardPrice}>{formatINR(item.finalPrice)}</Text>
          )}

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => shareToWhatsApp(item)}
              accessibilityLabel="Share on WhatsApp"
              accessibilityRole="button"
            >
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              <Text style={styles.shareButtonText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => exportToONDC(item)}
              accessibilityLabel="Export to ONDC"
              accessibilityRole="button"
            >
              <Ionicons name="cloud-upload-outline" size={18} color={COLORS.primary} />
              <Text style={styles.shareButtonText}>ONDC</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScreenHeader
        title="My Live Catalog"
        subtitle={`${products.length} product${products.length === 1 ? '' : 's'}`}
        onBack={() => navigation.goBack()}
        rightIcon="add-circle-outline"
        onRightPress={() => navigation.navigate('StudioCamera')}
      />

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.centerWrap}>
          <Ionicons name="basket-outline" size={56} color={COLORS.border} />
          <Text style={styles.emptyTitle}>No products yet</Text>
          <Text style={styles.emptySub}>Add your first craft to start selling</Text>
          <TouchableOpacity
            style={styles.emptyCta}
            onPress={() => navigation.navigate('StudioCamera')}
          >
            <Ionicons name="camera" size={18} color={COLORS.textOnPrimary} />
            <Text style={styles.emptyCtaText}>Add New Craft</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ paddingHorizontal: SPACING.md, gap: SPACING.md }}
          contentContainerStyle={{ paddingVertical: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.backgroundWarm },
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
    marginBottom: SPACING.lg,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    ...SHADOW.button,
  },
  emptyCtaText: {
    color: COLORS.textOnPrimary,
    fontWeight: FONT.weight.bold,
    marginLeft: SPACING.xs,
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
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: COLORS.backgroundWarm,
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  statusBadge: {
    position: 'absolute',
    top: SPACING.xs,
    left: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: FONT.weight.bold,
  },
  cardBody: { padding: SPACING.sm },
  cardTitle: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  cardCategory: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cardPrice: {
    fontSize: FONT.size.base,
    fontWeight: FONT.weight.black,
    color: COLORS.primary,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  acceptBtn: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.success,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
  }
});

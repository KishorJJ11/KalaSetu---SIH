import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { COLORS, FONT, RADIUS, SHADOW, SPACING } from '../theme/theme';
import { useArtisan } from '../context/ArtisanContext';
import { getArtisanDashboard } from '../utils/api';
import { categoryLabel, formatINR } from '../utils/constants';

export default function HomeScreen({ navigation }) {
  const { artisan, signOut } = useArtisan();
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!artisan?.id) return;
    try {
      const res = await getArtisanDashboard(artisan.id);
      setStats(res.data.stats);
    } catch (err) {
      console.warn('[KalaSetu] Dashboard load failed:', err.message);
    }
  }, [artisan]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>नमस्ते, {artisan?.name?.split(' ')[0] || 'Artisan'} 👋</Text>
            <Text style={styles.headerSub}>
              {categoryLabel(artisan?.craftCategory)} · {artisan?.state}
            </Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Sign out"
            accessibilityRole="button"
            onPress={signOut}
            style={styles.avatarButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="log-out-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.schemeBanner}>
          <Ionicons name="shield-checkmark" size={26} color={COLORS.textOnPrimary} />
          <View style={{ flex: 1, marginLeft: SPACING.sm }}>
            <Text style={styles.schemeTitle}>Ministry of Social Justice & Empowerment</Text>
            <Text style={styles.schemeSub}>Your craft is backed by a MoSJE-supported market linkage scheme</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatPill label="Live Products" value={stats?.liveProducts ?? '—'} icon="storefront-outline" />
          <StatPill label="Drafts" value={stats?.draftProducts ?? '—'} icon="document-outline" />
          <StatPill label="Total Earnings" value={formatINR(stats?.totalEarnings ?? 0)} icon="cash-outline" wide />
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <TouchableOpacity
          style={[styles.actionCard, styles.actionCardPrimary]}
          onPress={() => navigation.navigate('StudioCamera')}
          accessibilityRole="button"
        >
          <View style={styles.actionIconWrapPrimary}>
            <Ionicons name="camera" size={28} color={COLORS.textOnPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionCardTitlePrimary}>Add New Craft</Text>
            <Text style={styles.actionCardSubPrimary}>Snap a photo — AI studio-enhances it in seconds</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={COLORS.textOnPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Catalog')}
          accessibilityRole="button"
        >
          <View style={styles.actionIconWrap}>
            <Ionicons name="grid-outline" size={26} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionCardTitle}>My Live Catalog</Text>
            <Text style={styles.actionCardSub}>View, edit, and share your studio-ready products</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('BuyerPreview')}
          accessibilityRole="button"
        >
          <View style={styles.actionIconWrap}>
            <Ionicons name="eye-outline" size={26} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionCardTitle}>Earnings / Orders</Text>
            <Text style={styles.actionCardSub}>See how buyers view your marketplace listings</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>

      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ChatScreen')}
        accessibilityRole="button"
        accessibilityLabel="AI Assistant"
      >
        <Ionicons name="sparkles" size={28} color={COLORS.textOnPrimary} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function StatPill({ label, value, icon, wide }) {
  return (
    <View style={[styles.statPill, wide && styles.statPillWide]}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.backgroundWarm },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  greeting: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  headerSub: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  schemeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOW.card,
  },
  schemeTitle: {
    color: COLORS.textOnPrimary,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
  },
  schemeSub: {
    color: COLORS.textOnPrimary,
    fontSize: FONT.size.xs,
    marginTop: 2,
    opacity: 0.9,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.lg,
  },
  statPill: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    alignItems: 'center',
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  statPillWide: {
    minWidth: '100%',
  },
  statValue: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.black,
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  statLabel: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: FONT.size.base,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOW.card,
  },
  actionCardPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.backgroundWarm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  actionIconWrapPrimary: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  actionCardTitle: {
    fontSize: FONT.size.base,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  actionCardSub: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  actionCardTitlePrimary: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textOnPrimary,
  },
  actionCardSubPrimary: {
    fontSize: FONT.size.xs,
    color: COLORS.textOnPrimary,
    opacity: 0.9,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.xl,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';

import ScreenHeader from '../components/ScreenHeader';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from '../theme/theme';
import { API_BASE_URL, AI_BASE_URL } from '../utils/api';

export default function StudioCameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const [capturedAsset, setCapturedAsset] = useState(null); // { uri, fileName, mimeType }
  const [studioPreviewUri, setStudioPreviewUri] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [previewMode, setPreviewMode] = useState('after'); // 'before' | 'after'

  const takePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85, shutterSound: false });
      const asset = {
        uri: photo.uri,
        fileName: `craft-${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
      };
      setCapturedAsset(asset);
      await runEnhancementPreview(asset);
    } catch (err) {
      Alert.alert('Capture failed', err.message || 'Could not take photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.length) return;
    const picked = result.assets[0];
    const asset = {
      uri: picked.uri,
      fileName: picked.fileName || `craft-${Date.now()}.jpg`,
      mimeType: picked.mimeType || 'image/jpeg',
    };
    setCapturedAsset(asset);
    await runEnhancementPreview(asset);
  };

  const runEnhancementPreview = async (asset) => {
    setIsEnhancing(true);
    setStudioPreviewUri(null);
    try {
      const form = new FormData();
      form.append('file', { 
        uri: asset.uri, 
        name: asset.fileName || 'photo.jpg', 
        type: asset.mimeType || 'image/jpeg' 
      });
      form.append('return_format', 'base64');

      const response = await axios.post(`${AI_BASE_URL}/api/ai/enhance-image`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const json = response.data;
      setStudioPreviewUri(json.imageBase64);
      setPreviewMode('after');
    } catch (err) {
      console.warn('[KalaSetu] Preview enhancement failed:', err.message);
      Alert.alert(
        'AI enhancement unavailable',
        'Could not generate a studio preview right now. You can still continue — enhancement will retry automatically.'
      );
    } finally {
      setIsEnhancing(false);
    }
  };

  const retake = () => {
    setCapturedAsset(null);
    setStudioPreviewUri(null);
  };

  const proceedToPricing = () => {
    if (!capturedAsset) return;
    navigation.navigate('SmartPricing', { imageAsset: capturedAsset });
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader title="Studio Camera" onBack={() => navigation.goBack()} />
        <View style={styles.permissionWrap}>
          <Ionicons name="camera-outline" size={56} color={COLORS.primary} />
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionSub}>
            KalaSetu needs your camera to photograph your craft for AI studio enhancement.
          </Text>
          <PrimaryButton label="Grant Camera Access" icon="camera" onPress={requestPermission} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScreenHeader title="Studio Camera" subtitle="Frame your craft in the guide" onBack={() => navigation.goBack()} />

      {!capturedAsset ? (
        <View style={styles.cameraWrap}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          <View style={styles.framingGuide} pointerEvents="none">
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
            <View style={styles.cornerBR} />
          </View>
          <View style={styles.guideTextWrap} pointerEvents="none">
            <Text style={styles.guideText}>Place your craft inside the frame · good light works best</Text>
          </View>

          <View style={styles.captureBar}>
            <TouchableOpacity
              onPress={pickFromGallery}
              style={styles.galleryButton}
              accessibilityLabel="Choose from gallery"
              accessibilityRole="button"
            >
              <Ionicons name="images-outline" size={26} color={COLORS.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={takePhoto}
              style={styles.shutterButton}
              disabled={isCapturing}
              accessibilityLabel="Take photo"
              accessibilityRole="button"
            >
              {isCapturing ? (
                <ActivityIndicator color={COLORS.textOnPrimary} />
              ) : (
                <View style={styles.shutterInner} />
              )}
            </TouchableOpacity>

            <View style={{ width: 52 }} />
          </View>
        </View>
      ) : (
        <View style={styles.previewWrap}>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleButton, previewMode === 'before' && styles.toggleButtonActive]}
              onPress={() => setPreviewMode('before')}
            >
              <Text style={[styles.toggleLabel, previewMode === 'before' && styles.toggleLabelActive]}>
                Original
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, previewMode === 'after' && styles.toggleButtonActive]}
              onPress={() => setPreviewMode('after')}
            >
              <Text style={[styles.toggleLabel, previewMode === 'after' && styles.toggleLabelActive]}>
                AI Studio ✨
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.imageFrame}>
            {previewMode === 'before' || !studioPreviewUri ? (
              <Image source={{ uri: capturedAsset.uri }} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <Image source={{ uri: studioPreviewUri }} style={styles.previewImage} resizeMode="contain" />
            )}

            {isEnhancing && (
              <View style={styles.enhancingOverlay}>
                <ActivityIndicator color={COLORS.textOnPrimary} size="large" />
                <Text style={styles.enhancingText}>AI is cleaning up the background…</Text>
              </View>
            )}
          </View>

          <View style={styles.previewActions}>
            <PrimaryButton
              label="Retake Photo"
              icon="camera-reverse-outline"
              variant="outline"
              onPress={retake}
              style={{ marginBottom: SPACING.sm }}
            />
            <PrimaryButton
              label="Next: Set Price"
              icon="arrow-forward"
              onPress={proceedToPricing}
              disabled={isEnhancing}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  cameraWrap: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  framingGuide: {
    position: 'absolute',
    top: '18%',
    left: '10%',
    right: '10%',
    bottom: '28%',
  },
  cornerTL: { position: 'absolute', top: 0, left: 0, width: 32, height: 32, borderTopWidth: 4, borderLeftWidth: 4, borderColor: COLORS.secondaryLight, borderTopLeftRadius: 8 },
  cornerTR: { position: 'absolute', top: 0, right: 0, width: 32, height: 32, borderTopWidth: 4, borderRightWidth: 4, borderColor: COLORS.secondaryLight, borderTopRightRadius: 8 },
  cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 32, height: 32, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: COLORS.secondaryLight, borderBottomLeftRadius: 8 },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderBottomWidth: 4, borderRightWidth: 4, borderColor: COLORS.secondaryLight, borderBottomRightRadius: 8 },
  guideTextWrap: {
    position: 'absolute',
    bottom: '16%',
    left: SPACING.lg,
    right: SPACING.lg,
    alignItems: 'center',
  },
  guideText: {
    color: '#FFFFFF',
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.medium,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.pill,
  },
  captureBar: {
    position: 'absolute',
    bottom: SPACING.xl,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
  },
  galleryButton: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.pill,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.raised,
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
  },
  previewWrap: { flex: 1, padding: SPACING.lg },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundWarm,
    borderRadius: RADIUS.pill,
    padding: 4,
    marginBottom: SPACING.md,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  toggleLabel: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textSecondary,
  },
  toggleLabelActive: {
    color: COLORS.textOnPrimary,
  },
  imageFrame: {
    flex: 1,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.backgroundWarm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewImage: { width: '100%', height: '100%' },
  enhancingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enhancingText: {
    color: '#FFFFFF',
    fontWeight: FONT.weight.semibold,
    marginTop: SPACING.sm,
  },
  previewActions: { marginTop: SPACING.md },
  permissionWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  permissionTitle: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  permissionSub: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
});

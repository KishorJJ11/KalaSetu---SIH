import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
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

  const [capturedAssets, setCapturedAssets] = useState([]); // array of { uri, fileName, mimeType }
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [studioPreviewUri, setStudioPreviewUri] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [previewMode, setPreviewMode] = useState('after'); // 'before' | 'after'

  const takePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    
    // Allow the UI to render the 'isCapturing' spinner before taking the heavy picture
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85, shutterSound: false });
      const asset = {
        uri: photo.uri,
        fileName: `craft-${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
      };
      const newAssets = [...capturedAssets, asset];
      setCapturedAssets(newAssets);
      setIsCameraActive(false);
      
      // Only run preview for the first image to save time
      if (newAssets.length === 1) {
        setTimeout(() => {
          runEnhancementPreview(asset);
        }, 100);
      }
      
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
    const newAssets = [...capturedAssets, asset];
    setCapturedAssets(newAssets);
    setIsCameraActive(false);
    
    if (newAssets.length === 1) {
      setTimeout(() => {
        runEnhancementPreview(asset);
      }, 100);
    }
  };

  const runEnhancementPreview = async (asset) => {
    setIsEnhancing(true);
    setStudioPreviewUri(null);
    
    // Yield to the UI thread so the loading animation can actually render
    // before we do heavy file reading and networking
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      if (Platform.OS === 'web') {
        const form = new FormData();
        const res = await fetch(asset.uri);
        const blob = await res.blob();
        form.append('file', blob, asset.fileName || 'photo.jpg');
        form.append('return_format', 'base64');

        const response = await axios.post(`${AI_BASE_URL}/api/ai/enhance-image`, form, {
          headers: { Accept: 'application/json' }
        });
        setStudioPreviewUri(response.data.imageBase64);
      } else {
        // Native (Android/iOS) - Use FileSystem to bypass JS bridge memory limits
        const response = await FileSystem.uploadAsync(`${AI_BASE_URL}/api/ai/enhance-image`, asset.uri, {
          fieldName: 'file',
          httpMethod: 'POST',
          uploadType: 1, // FileSystemUploadType.MULTIPART is 1
          parameters: {
            return_format: 'base64'
          }
        });
        
        if (response.status !== 200) {
          let errorMsg = 'Failed to enhance image';
          try {
            const errData = JSON.parse(response.body);
            errorMsg = errData.detail || errorMsg;
          } catch (e) {}
          throw { response: { status: response.status, data: { detail: errorMsg } } };
        }

        const json = JSON.parse(response.body);
        
        // Save base64 to a local file so FormData can upload it later
        const base64Data = json.imageBase64.replace('data:image/png;base64,', '');
        const tempUri = FileSystem.cacheDirectory + `enhanced-${Date.now()}.png`;
        await FileSystem.writeAsStringAsync(tempUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
        
        setStudioPreviewUri(tempUri);
      }
      
      setPreviewMode('after');
    } catch (err) {
      console.warn('[KalaSetu] Preview enhancement failed:', err.message);
      
      // If the backend actively rejected the image due to poor quality/blur (status 400)
      if (err.response && err.response.status === 400 && err.response.data && err.response.data.detail) {
        if (Platform.OS === 'web') {
          window.alert('Low Quality Image: ' + err.response.data.detail);
        } else {
          Alert.alert('Low Quality Image', err.response.data.detail);
        }
        retake();
      } else {
        // Fallback network error
        if (Platform.OS === 'web') {
          window.alert('AI enhancement unavailable. Error: ' + err.message);
        } else {
          Alert.alert(
            'AI enhancement unavailable',
            'Could not generate a studio preview right now. ' + err.message
          );
        }
      }
    } finally {
      setIsEnhancing(false);
    }
  };

  const retake = () => {
    setCapturedAssets([]);
    setStudioPreviewUri(null);
    setIsCameraActive(true);
  };

  const proceedToPricing = () => {
    if (capturedAssets.length === 0) return;
    
    // Pass the enhanced image if they selected the AI Studio tab
    const finalAssets = previewMode === 'after' && studioPreviewUri 
      ? [{ uri: studioPreviewUri, fileName: 'enhanced-craft.png', mimeType: 'image/png' }]
      : capturedAssets;
      
    navigation.navigate('SmartPricing', { imageAssets: finalAssets });
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

      {isCameraActive ? (
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
              <Image source={{ uri: capturedAssets[0].uri }} style={styles.previewImage} resizeMode="cover" />
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

          <View style={styles.thumbnailStrip}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {capturedAssets.map((asset, index) => (
                <View key={index} style={styles.thumbnailContainer}>
                  <Image source={{ uri: asset.uri }} style={styles.thumbnailImage} />
                  {index === 0 && <View style={styles.mainBadge}><Text style={styles.mainBadgeText}>Main</Text></View>}
                </View>
              ))}
              {capturedAssets.length < 5 && (
                <TouchableOpacity style={styles.addMoreButton} onPress={() => setIsCameraActive(true)}>
                  <Ionicons name="add" size={24} color={COLORS.primary} />
                  <Text style={styles.addMoreText}>Add more</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          <View style={styles.previewActions}>
            <PrimaryButton
              label="Clear All & Retake"
              icon="trash-outline"
              variant="outline"
              onPress={retake}
              style={{ marginBottom: SPACING.sm }}
            />
            <PrimaryButton
              label={`Next: Set Price (${capturedAssets.length} images)`}
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)', // Darker background to make loading state obvious
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  enhancingText: {
    color: '#FFFFFF',
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    marginTop: SPACING.md,
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
  thumbnailStrip: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  thumbnailContainer: {
    marginRight: SPACING.sm,
    position: 'relative',
  },
  thumbnailImage: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mainBadge: {
    position: 'absolute',
    bottom: -5,
    alignSelf: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mainBadgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  addMoreButton: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  addMoreText: {
    fontSize: 8,
    color: COLORS.primary,
    marginTop: 2,
  },
});

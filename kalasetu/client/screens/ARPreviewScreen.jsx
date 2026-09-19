import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Animated, PanResponder, Image, Dimensions, TouchableOpacity, Text } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT, SPACING, RADIUS } from '../theme/theme';

const { width } = Dimensions.get('window');

export default function ARPreviewScreen({ route, navigation }) {
  const { imageUrl } = route.params || {};
  const [permission, requestPermission] = useCameraPermissions();

  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  
  // Track previous values for zooming and panning
  const baseScale = useRef(1);
  const pinchDistance = useRef(0);

  // Math helper for calculating distance between two fingers
  const calcDistance = (touches) => {
    const [t1, t2] = touches;
    const dx = t1.pageX - t2.pageX;
    const dy = t1.pageY - t2.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        // Only reset offset if we are interacting with one finger
        if (evt.nativeEvent.touches.length === 1) {
          pan.setOffset({
            x: pan.x._value,
            y: pan.y._value
          });
          pan.setValue({ x: 0, y: 0 });
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          // Pinch to zoom
          const distance = calcDistance(touches);
          if (pinchDistance.current > 0) {
            const scaleChange = distance / pinchDistance.current;
            scale.setValue(baseScale.current * scaleChange);
          } else {
            pinchDistance.current = distance;
          }
        } else if (touches.length === 1 && pinchDistance.current === 0) {
          // Drag
          pan.setValue({ x: gestureState.dx, y: gestureState.dy });
        }
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
        baseScale.current = scale._value;
        pinchDistance.current = 0;
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
        baseScale.current = scale._value;
        pinchDistance.current = 0;
      }
    })
  ).current;

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) {
    return <View style={styles.container} />;
  }
  
  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Camera access is required for AR view</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFillObject} facing="back">
        
        {/* Navigation Header overlay */}
        <SafeAreaView style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.instructions}>
            <Ionicons name="move" size={16} color={COLORS.textPrimary} style={{marginRight: 6}} />
            <Text style={styles.instText}>Drag to move &middot; Pinch to scale</Text>
          </View>
        </SafeAreaView>

        {/* Movable & Scalable Image Overlay */}
        <View style={styles.overlayArea} {...panResponder.panHandlers}>
          <Animated.View
            style={[
              styles.imageContainer,
              {
                transform: [
                  { translateX: pan.x },
                  { translateY: pan.y },
                  { scale: scale }
                ]
              }
            ]}
          >
            {imageUrl ? (
              <Image 
                source={{ uri: imageUrl }} 
                style={styles.image} 
                resizeMode="contain" 
              />
            ) : (
              <View style={styles.imageError}>
                <Ionicons name="image-outline" size={40} color={COLORS.textSecondary} />
                <Text style={{color: COLORS.textSecondary, marginTop: 10}}>No Image</Text>
              </View>
            )}
          </Animated.View>
        </View>

      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    color: '#fff',
    fontSize: FONT.size.md,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  btnText: {
    color: '#fff',
    fontWeight: FONT.weight.bold,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    zIndex: 10,
  },
  backBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructions: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.pill,
  },
  instText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.medium,
    color: COLORS.textPrimary,
  },
  overlayArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    width: width * 0.7,
    height: width * 0.7,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageError: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderStyle: 'dashed'
  }
});

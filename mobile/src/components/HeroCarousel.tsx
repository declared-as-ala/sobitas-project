import React, { useRef, useState } from 'react';
import {
  View,
  Image,
  FlatList,
  StyleSheet,
  Dimensions,
  ImageSourcePropType,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../constants/theme';

const { width } = Dimensions.get('window');

interface HeroCarouselProps {
  slides: ImageSourcePropType[];
  height?: number;
  /** Overlay content rendered on top of every slide (title, CTA, etc). */
  children?: React.ReactNode;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({
  slides,
  height = 260,
  children,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    if (index !== activeIndex) setActiveIndex(index);
  };

  return (
    <View style={[styles.container, { height }]}>
      <FlatList
        ref={listRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => `slide-${i}`}
        onMomentumScrollEnd={handleScroll}
        renderItem={({ item }) => (
          <Image source={item} style={{ width, height }} resizeMode="cover" />
        )}
      />
      <LinearGradient
        colors={theme.gradients.heroScrim}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.overlayContent} pointerEvents="box-none">
          {children}
        </View>
      </View>
      {slides.length > 1 && (
        <View style={styles.dotsRow} pointerEvents="none">
          {slides.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: theme.colors.secondaryDark,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  overlayContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  dotsRow: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    right: theme.spacing.lg,
    flexDirection: 'row',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: theme.borderRadius.round,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginLeft: 5,
  },
  dotActive: {
    backgroundColor: theme.colors.primary,
    width: 18,
  },
});

export default HeroCarousel;

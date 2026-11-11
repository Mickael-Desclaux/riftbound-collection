/**
 * Passage de la grille à la fiche (spec § 2.2), en repli « agrandissement
 * puis fondu » : les Shared Element Transitions de Reanimated, encore
 * expérimentales, se sont montrées instables sur un vrai Android (#31).
 *
 * Au toucher d'une case, une copie de son image part de la case et grandit
 * jusqu'à la place de l'image de la fiche, pendant que la fiche apparaît en
 * fondu dessous ; la copie s'efface ensuite et laisse voir la vraie image.
 * Au retour, la fiche s'efface en fondu sur la grille, restée à sa place.
 *
 * Toute l'animation tient dans ce module ; elle n'utilise que les API stables
 * de Reanimated.
 */
import { Image } from 'expo-image';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CARD_ASPECT_RATIO } from '@/ui/printing-grid/gridPrinting';

const GROW_MS = 220;
const FADE_DELAY_MS = 80;
const FADE_MS = 180;

/** Mise en page de la grande image de la fiche, partagée avec elle pour que le zoom y arrive. */
export const DETAIL_IMAGE_LAYOUT = {
  /** Hauteur de la barre ← / ↗. */
  topBarHeight: 52,
  /** Marge du contenu de la fiche. */
  padding: 16,
  /** Part de la largeur du contenu occupée par l'image. */
  widthRatio: 0.8,
} as const;

/** La fiche apparaît en fondu sous l'image qui grandit, et s'efface de même au retour. */
export const printingDetailScreenOptions = { animation: 'fade' } as const;

/** Un rectangle dans la fenêtre, comme le donne `measureInWindow`. */
export type WindowRect = { x: number; y: number; width: number; height: number };

/** Une vue qui sait donner sa place dans la fenêtre (une `View` montée). */
type Measurable = {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
} | null;

type Zoom = {
  /** Lance l'agrandissement depuis la vue `from` (l'image d'une case). */
  zoomFrom: (from: Measurable, uri: string | null) => void;
};

/** Sans fournisseur (tests, écrans hors onglets), toucher une case ouvre la fiche sans animation. */
const ZoomContext = createContext<Zoom>({ zoomFrom: () => {} });

export function usePrintingZoom(): Zoom {
  return useContext(ZoomContext);
}

/** Où arrive l'image : la place de la grande image de la fiche. */
function detailImageRect(windowWidth: number, topInset: number): WindowRect {
  const { topBarHeight, padding, widthRatio } = DETAIL_IMAGE_LAYOUT;
  const width = (windowWidth - 2 * padding) * widthRatio;
  return {
    x: (windowWidth - width) / 2,
    y: topInset + topBarHeight + padding,
    width,
    height: width / CARD_ASPECT_RATIO,
  };
}

export function PrintingZoomProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { width: windowWidth } = useWindowDimensions();
  const { top } = useSafeAreaInsets();
  const [uri, setUri] = useState<string | null>(null);
  const start = useSharedValue<WindowRect>({ x: 0, y: 0, width: 0, height: 0 });
  const end = useSharedValue<WindowRect>({ x: 0, y: 0, width: 0, height: 0 });
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  const zoomFrom = useCallback(
    (from: Measurable, nextUri: string | null) => {
      if (!from || !nextUri) return;
      from.measureInWindow((x, y, width, height) => {
        setUri(nextUri);
        start.value = { x, y, width, height };
        end.value = detailImageRect(windowWidth, top);
        progress.value = 0;
        progress.value = withTiming(1, { duration: GROW_MS });
        opacity.value = withSequence(
          withTiming(1, { duration: 0 }),
          withDelay(GROW_MS + FADE_DELAY_MS, withTiming(0, { duration: FADE_MS })),
        );
      });
    },
    [windowWidth, top, start, end, progress, opacity],
  );

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const from = start.value;
    const to = end.value;
    return {
      opacity: opacity.value,
      left: interpolate(p, [0, 1], [from.x, to.x]),
      top: interpolate(p, [0, 1], [from.y, to.y]),
      width: interpolate(p, [0, 1], [from.width, to.width]),
      height: interpolate(p, [0, 1], [from.height, to.height]),
      borderRadius: interpolate(p, [0, 1], [8, 14]),
    };
  });

  const zoom = useMemo(() => ({ zoomFrom }), [zoomFrom]);
  return (
    <ZoomContext.Provider value={zoom}>
      <View style={styles.container}>
        {children}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {/* Image décorative : la fiche porte la vraie, avec son libellé. */}
          <Animated.View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[styles.flying, style]}
          >
            {uri && (
              <Image
                testID="printing-zoom-image"
                source={{ uri }}
                cachePolicy="disk"
                contentFit="cover"
                style={styles.image}
              />
            )}
          </Animated.View>
        </View>
      </View>
    </ZoomContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flying: { position: 'absolute', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
});

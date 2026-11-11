/**
 * Passage de la grille à la fiche (spec § 2.2), en repli « agrandissement
 * puis fondu » : les Shared Element Transitions de Reanimated, encore
 * expérimentales, se sont montrées instables sur un vrai Android (#31).
 *
 * Au toucher d'une case, une copie de son image part de la case et grandit
 * jusqu'à la place de l'image de la fiche, pendant que la fiche apparaît en
 * fondu dessous ; la copie s'efface ensuite et laisse voir la vraie image.
 * Au retour, la fiche s'efface en fondu sur la grille, restée à sa place
 * (`PrintingDetailFade`).
 *
 * Toute l'animation tient dans ce module ; elle n'utilise que les API stables
 * de Reanimated.
 */
import { Image } from 'expo-image';
import { usePreventRemove } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
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

/**
 * La fiche se pose sur la grille, qui reste visible dessous, sans animation de
 * la pile : `PrintingDetailFade` la fait apparaître et s'effacer en fondu. Le
 * fondu de la pile native n'est pas réglable sur Android, et trop bref : le
 * fond sombre de la fiche recouvrait la grille d'un coup.
 */
export const printingDetailScreenOptions = {
  presentation: 'transparentModal',
  animation: 'none',
} as const;

const DETAIL_FADE_IN_MS = 300;
const DETAIL_FADE_OUT_MS = 200;

/**
 * Enveloppe la fiche : elle apparaît en fondu, fond compris, pendant que
 * l'image grandit ; à sa fermeture (←, retour Android), elle s'efface en fondu
 * avant de quitter la pile.
 */
export function PrintingDetailFade({ children }: Readonly<{ children: ReactNode }>) {
  const opacity = useSharedValue(0);
  const [faded, setFaded] = useState(false);

  useEffect(() => {
    opacity.set(withTiming(1, { duration: DETAIL_FADE_IN_MS }));
  }, [opacity]);

  // La fermeture est retenue le temps du fondu, puis relancée telle quelle.
  usePreventRemove(!faded, ({ repeat }) => {
    opacity.set(withTiming(0, { duration: DETAIL_FADE_OUT_MS }));
    setTimeout(() => {
      setFaded(true);
      repeat();
    }, DETAIL_FADE_OUT_MS);
  });

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.container, style]}>{children}</Animated.View>;
}

/** Un rectangle dans la fenêtre, comme le donne `measureInWindow`. */
export type WindowRect = { x: number; y: number; width: number; height: number };

/** Une vue qui sait donner sa place dans la fenêtre (une `View` montée). */
type Measurable = {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
} | null;

type Zoom = {
  /**
   * Lance l'agrandissement depuis la vue `from` (l'image d'une case), puis
   * appelle `open` pour ouvrir la fiche.
   */
  zoomFrom: (from: Measurable, uri: string | null, open: () => void) => void;
};

/** Sans fournisseur (tests, écrans hors onglets), toucher une case ouvre la fiche sans animation. */
const ZoomContext = createContext<Zoom>({ zoomFrom: (_from, _uri, open) => open() });

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
  // L'image volante a la taille d'arrivée ; on ne l'anime que par `transform`
  // (déplacement et échelle), sans recalcul de mise en page à chaque image.
  const target = detailImageRect(windowWidth, top);
  const start = useSharedValue<WindowRect>(target);
  const progress = useSharedValue(1);
  const opacity = useSharedValue(0);

  const zoomFrom = useCallback(
    (from: Measurable, nextUri: string | null, open: () => void) => {
      if (!from || !nextUri) {
        open();
        return;
      }
      from.measureInWindow((x, y, width, height) => {
        setUri(nextUri);
        start.set({ x, y, width, height });
        progress.set(0);
        progress.set(withTiming(1, { duration: GROW_MS }));
        opacity.set(
          withSequence(
            withTiming(1, { duration: 0 }),
            withDelay(GROW_MS + FADE_DELAY_MS, withTiming(0, { duration: FADE_MS })),
          ),
        );
        // La fiche, plus lourde à construire, attend que l'image ait commencé à voler.
        requestAnimationFrame(open);
      });
    },
    [start, progress, opacity],
  );

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const from = start.value;
    const scale = from.width / target.width;
    // Écarts entre le centre de la case et celui de l'image de la fiche.
    const dx = from.x + from.width / 2 - (target.x + target.width / 2);
    const dy = from.y + from.height / 2 - (target.y + target.height / 2);
    return {
      opacity: opacity.value,
      transform: [
        { translateX: interpolate(p, [0, 1], [dx, 0]) },
        { translateY: interpolate(p, [0, 1], [dy, 0]) },
        { scale: interpolate(p, [0, 1], [scale, 1]) },
      ],
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
            style={[
              styles.flying,
              { left: target.x, top: target.y, width: target.width, height: target.height },
              style,
            ]}
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
  // À la taille de la fiche, ce rayon donne celui de la case une fois réduit.
  flying: { position: 'absolute', overflow: 'hidden', borderRadius: 14 },
  image: { width: '100%', height: '100%' },
});

import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { SharedTransition } from 'react-native-reanimated';

import type { PrintingCode } from '@/domain/printingCode';

/**
 * Zoom partagé entre la grille et la fiche (spec § 2.2) : l'image d'une
 * Version vole de sa case jusqu'à la fiche, et revient à sa place au retour.
 *
 * C'est le seul composant qui anime cette transition. Elle repose sur les
 * Shared Element Transitions de Reanimated, encore expérimentales, activées
 * par le flag statique `ENABLE_SHARED_ELEMENT_TRANSITIONS` (package.json).
 * Elles ne fonctionnent qu'entre deux écrans d'une même pile native : la
 * grille et la fiche sont dans la pile de leur onglet.
 */
const zoom = SharedTransition.duration(350);

export function SharedPrintingImage({
  printingCode,
  style,
  children,
}: Readonly<{ printingCode: PrintingCode; style: StyleProp<ViewStyle>; children: ReactNode }>) {
  return (
    <Animated.View
      // Une seule image par Version et par écran porte ce nom.
      sharedTransitionTag={`printing-${printingCode}`}
      sharedTransitionStyle={zoom}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

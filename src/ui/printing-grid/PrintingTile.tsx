import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/ui/theme';

import type { GridPrinting } from './PrintingGrid';

/** Format des cartes Riftbound (largeur / hauteur). */
export const CARD_ASPECT_RATIO = 744 / 1039;

/** Une case de grille : image, nom et Code de version. */
export function PrintingTile({ printing }: { printing: GridPrinting }) {
  return (
    <View style={styles.tile}>
      <PrintingImage printing={printing} />
      <Text numberOfLines={1} style={styles.name}>
        {printing.name}
      </Text>
      <Text style={styles.code}>{printing.printingCode}</Text>
    </View>
  );
}

/**
 * Image de la Version, chargée et mise en cache disque par expo-image. Si elle
 * est indisponible : un cadre avec le nom et le code ; un toucher relance.
 */
function PrintingImage({ printing }: { printing: GridPrinting }) {
  const uri = printing.imageNormal ?? printing.imageSmall;
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  if (uri === null || failed) {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={uri === null}
        onPress={() => {
          setFailed(false);
          setAttempt(attempt + 1);
        }}
        style={[styles.image, styles.frame]}
      >
        <Text style={styles.frameName}>{printing.name}</Text>
        <Text style={styles.code}>{printing.printingCode}</Text>
        {uri !== null && (
          <Text style={styles.frameHint}>Image indisponible · toucher pour réessayer</Text>
        )}
      </Pressable>
    );
  }
  return (
    <Image
      key={attempt}
      accessibilityLabel={`Image de ${printing.name}`}
      source={{ uri }}
      cachePolicy="disk"
      contentFit="cover"
      transition={150}
      onError={() => setFailed(true)}
      style={styles.image}
    />
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 6 },
  image: {
    width: '100%',
    aspectRatio: CARD_ASPECT_RATIO,
    borderRadius: 8,
    backgroundColor: colors.line,
  },
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.background,
  },
  frameName: { color: colors.text, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  frameHint: { color: colors.muted, fontSize: 11, textAlign: 'center' },
  name: { color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 6 },
  code: { color: colors.muted, fontSize: 12 },
});

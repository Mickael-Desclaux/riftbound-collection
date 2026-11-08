import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/ui/theme';

import { gridImageUri, type GridPrinting } from './gridPrinting';

/** Format des cartes Riftbound (largeur / hauteur). */
export const CARD_ASPECT_RATIO = 744 / 1039;

/** Nouvelles tentatives automatiques d'une image indisponible, espacées de 5 s, 10 s, 15 s. */
const AUTO_RETRIES = 3;
const RETRY_DELAY_MS = 5_000;

/** Une case de grille : image, nom et Code de version. */
export function PrintingTile({ printing }: { printing: GridPrinting }) {
  const uri = gridImageUri(printing);
  return (
    <View
      accessible
      accessibilityLabel={`${printing.name}, ${printing.printingCode}`}
      style={styles.tile}
    >
      {/* `key` : une nouvelle adresse d'image repart d'un état neuf. */}
      <PrintingImage key={uri} printing={printing} uri={uri} />
      <Text numberOfLines={1} style={styles.name}>
        {printing.name}
      </Text>
      <Text style={styles.code}>{printing.printingCode}</Text>
    </View>
  );
}

/**
 * Image de la Version, chargée et mise en cache disque par expo-image. Si elle
 * est indisponible : un cadre avec le nom et le code, une nouvelle tentative
 * automatique un peu plus tard, et un toucher relance tout de suite (spec § 6).
 */
function PrintingImage({ printing, uri }: { printing: GridPrinting; uri: string | null }) {
  const [failures, setFailures] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!failed || failures > AUTO_RETRIES) return;
    const timer = setTimeout(() => setFailed(false), RETRY_DELAY_MS * failures);
    return () => clearTimeout(timer);
  }, [failed, failures]);

  if (uri === null || failed) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Réessayer l'image de ${printing.name}`}
        disabled={uri === null}
        onPress={() => setFailed(false)}
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
      // Remonter l'image relance son chargement.
      key={failures}
      accessibilityLabel={`Image de ${printing.name}`}
      source={{ uri }}
      cachePolicy="disk"
      contentFit="cover"
      transition={150}
      onError={() => {
        setFailures(failures + 1);
        setFailed(true);
      }}
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

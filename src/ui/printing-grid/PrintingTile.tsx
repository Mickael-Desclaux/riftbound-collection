import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Currency } from '@/domain/price';
import { formatPercentChange, formatPrice } from '@/ui/format';
import { darkPalette, type Palette, useThemedStyles } from '@/ui/theme';

import { CARD_ASPECT_RATIO, gridImageUri, type GridPrinting } from './gridPrinting';

/** Nouvelles tentatives automatiques d'une image indisponible, espacées de 5 s, 10 s, 15 s. */
const AUTO_RETRIES = 3;
const RETRY_DELAY_MS = 5_000;

/**
 * Une case de grille : image, nom, Code de version et prix ; badge « ×n » si
 * la Version est possédée, ✓ qui bascule possédée / non possédée, et ♡ qui
 * l'ajoute à la Liste de souhaits ou l'en retire.
 */
export function PrintingTile({
  printing,
  displayCurrency,
  onPress,
  onToggleOwned,
  onToggleWishlisted,
  showWishlistChange,
}: Readonly<{
  printing: GridPrinting;
  displayCurrency: Currency;
  onPress: () => void;
  onToggleOwned: () => void;
  onToggleWishlisted: () => void;
  showWishlistChange: boolean;
}>) {
  const styles = useThemedStyles(makeStyles);
  const uri = gridImageUri(printing);
  const price = formatPrice(printing.price, displayCurrency);
  const owned = printing.ownedQuantity > 0;
  const wished = printing.wishlistedAt !== null;
  const change = printing.wishlistPriceChange;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      accessibilityLabel={[
        printing.name,
        printing.printingCode,
        printing.price === null ? 'prix inconnu' : price,
        ...(owned ? [`possédée ×${printing.ownedQuantity}`] : []),
        ...(printing.inCatalog ? [] : ['absente du Catalogue']),
      ].join(', ')}
      style={[styles.tile, !printing.inCatalog && styles.unknown]}
    >
      <View>
        {/* `key` : une nouvelle adresse d'image repart d'un état neuf. */}
        <PrintingImage key={uri} printing={printing} uri={uri} />
        {owned && (
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>×{printing.ownedQuantity}</Text>
          </View>
        )}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: owned }}
          accessibilityLabel={`Possédée : ${printing.name}`}
          onPress={onToggleOwned}
          hitSlop={6}
          style={[styles.corner, styles.check, owned && styles.checkOn]}
        >
          <Text style={[styles.cornerMark, owned && styles.checkMarkOn]}>✓</Text>
        </Pressable>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: wished }}
          accessibilityLabel={`En souhait : ${printing.name}`}
          onPress={onToggleWishlisted}
          hitSlop={6}
          style={[styles.corner, styles.heart]}
        >
          <Text style={[styles.cornerMark, wished && styles.heartOn]}>{wished ? '♥' : '♡'}</Text>
        </Pressable>
      </View>
      <Text numberOfLines={1} style={styles.name}>
        {printing.name}
      </Text>
      <View style={styles.footer}>
        <Text style={styles.code}>{printing.printingCode}</Text>
        <Text style={styles.price}>{price}</Text>
      </View>
      {showWishlistChange && wished && (
        <Text style={styles.code}>
          {change === null
            ? 'Pas encore de variation'
            : `${formatPercentChange(change)} depuis l’ajout`}
        </Text>
      )}
    </Pressable>
  );
}

/**
 * Image de la Version, chargée et mise en cache disque par expo-image. Si elle
 * est indisponible : un cadre avec le nom et le code, une nouvelle tentative
 * automatique un peu plus tard, et un toucher relance tout de suite (spec § 6).
 */
function PrintingImage({ printing, uri }: { printing: GridPrinting; uri: string | null }) {
  const styles = useThemedStyles(makeStyles);
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

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    tile: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 6 },
    unknown: { borderWidth: 1, borderColor: colors.muted, opacity: 0.7 },
    badge: {
      position: 'absolute',
      left: 6,
      bottom: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      backgroundColor: colors.accent,
    },
    badgeLabel: { color: colors.onAccent, fontSize: 12, fontWeight: '700' },
    corner: {
      position: 'absolute',
      top: 6,
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: '#000a',
    },
    heart: { left: 6 },
    // Les coins sont posés sur l'image, sous un voile noir : couleurs du thème sombre dans les deux thèmes.
    heartOn: { color: darkPalette.accent },
    check: { right: 6 },
    checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    cornerMark: { color: darkPalette.text, fontSize: 16, fontWeight: '700' },
    checkMarkOn: { color: colors.onAccent },
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
    footer: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
    price: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  });

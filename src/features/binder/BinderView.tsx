import { Image } from 'expo-image';
import { FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BinderPage } from '@/domain/binder';
import type { CatalogEntry } from '@/domain/catalogEntry';
import { Button, controlStyles } from '@/ui/controls';
import { formatBinderSummary } from '@/ui/format';
import { CARD_ASPECT_RATIO } from '@/ui/printing-grid/gridPrinting';
import { colors } from '@/ui/theme';

/** Les options d'export, cochées par défaut (spec § 2.5). */
export type BinderExportOptions = { showPrices: boolean; markOwned: boolean };

/** Où en est l'export : téléchargement des images, puis création du PDF. */
export type BinderExportStatus =
  { step: 'idle' } | { step: 'images'; done: number; total: number } | { step: 'pdf' };

type Props = {
  pages: BinderPage[];
  expansionNames: ReadonlyMap<string, string>;
  options: BinderExportOptions;
  onOptionsChange: (options: BinderExportOptions) => void;
  status: BinderExportStatus;
  onExport: () => void;
  /** Toucher une carte la retire du classeur. */
  onRemove: (printing: CatalogEntry) => void;
  onBack: () => void;
};

/**
 * Écran Classeur (spec § 2.5) : les cartes dans l'ordre d'impression, page par
 * page, « N cartes · P pages A4 », les options et « Exporter en PDF ».
 */
export function BinderView({
  pages,
  expansionNames,
  options,
  onOptionsChange,
  status,
  onExport,
  onRemove,
  onBack,
}: Readonly<Props>) {
  const cardCount = pages.reduce((count, page) => count + page.printings.length, 0);
  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour"
          hitSlop={8}
          onPress={onBack}
        >
          <Text style={styles.back}>←</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          Classeur
        </Text>
      </View>
      {cardCount === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Ton classeur est vide.</Text>
          <Text style={styles.hint}>
            Ajoute des cartes avec « + Classeur » sur leur fiche, ou toutes celles d’une recherche
            depuis les filtres.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.summary}>{formatBinderSummary(cardCount, pages.length)}</Text>
          <Option
            label="Afficher les prix"
            value={options.showPrices}
            onChange={(showPrices) => onOptionsChange({ ...options, showPrices })}
          />
          <Option
            label="Marquer les cartes possédées"
            value={options.markOwned}
            onChange={(markOwned) => onOptionsChange({ ...options, markOwned })}
          />
          <ExportAction status={status} onExport={onExport} />
          <Text style={styles.hint}>Touche une carte pour la retirer du classeur.</Text>
        </>
      )}
    </View>
  );
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <FlatList
        data={pages}
        keyExtractor={(page) => `${page.expansionCode}-${page.number}`}
        ListHeaderComponent={header}
        contentContainerStyle={styles.content}
        renderItem={({ item: page }) => (
          <View style={styles.page}>
            <Text style={styles.pageTitle}>
              {expansionNames.get(page.expansionCode) ?? page.expansionCode} · page {page.number}/
              {page.count}
            </Text>
            <View style={styles.cards}>
              {page.printings.map((printing, index) => (
                <Pressable
                  key={printing.printingCode}
                  accessibilityRole="button"
                  accessibilityLabel={`Retirer ${printing.name} (${printing.printingCode}) du classeur`}
                  onPress={() => onRemove(printing)}
                  style={[styles.card, index % 3 !== 2 && styles.cardSpacing]}
                >
                  {(printing.imageSmall ?? printing.imageNormal) ? (
                    <Image
                      source={{ uri: printing.imageSmall ?? printing.imageNormal ?? undefined }}
                      cachePolicy="disk"
                      contentFit="contain"
                      style={styles.image}
                    />
                  ) : (
                    <View style={[styles.image, styles.frame]}>
                      <Text style={styles.frameText}>{printing.printingCode}</Text>
                    </View>
                  )}
                  <Text numberOfLines={1} style={styles.cardName}>
                    {printing.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function ExportAction({
  status,
  onExport,
}: Readonly<{ status: BinderExportStatus; onExport: () => void }>) {
  if (status.step === 'idle') {
    return <Button label="Exporter en PDF" variant="primary" onPress={onExport} />;
  }
  const label =
    status.step === 'images'
      ? `Téléchargement des images : ${status.done} / ${status.total}`
      : 'Création du PDF…';
  const progress = status.step === 'images' && status.total > 0 ? status.done / status.total : 1;
  return (
    <View accessibilityLiveRegion="polite" style={styles.progress}>
      <Text style={styles.progressLabel}>{label}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
    </View>
  );
}

function Option({
  label,
  value,
  onChange,
}: Readonly<{ label: string; value: boolean; onChange: (value: boolean) => void }>) {
  return (
    <View style={styles.option}>
      <Text style={styles.optionLabel}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.accent, false: colors.line }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  header: { gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { color: colors.text, fontSize: 22 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  summary: { color: colors.text, fontSize: 15, fontWeight: '600' },
  hint: { color: colors.muted, fontSize: 13 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 48 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionLabel: { color: colors.text, fontSize: 15 },
  progress: { ...controlStyles.idle, borderRadius: 8, padding: 12, gap: 8 },
  progressLabel: { color: colors.text, fontSize: 14 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.accent },
  page: { gap: 8 },
  pageTitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cards: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
  // Largeur fixe : une rangée incomplète garde la même taille de case.
  card: { width: '32%', gap: 4 },
  cardSpacing: { marginRight: '2%' },
  image: { width: '100%', aspectRatio: CARD_ASPECT_RATIO, borderRadius: 6 },
  frame: { backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  frameText: { color: colors.muted, fontSize: 11 },
  cardName: { color: colors.text, fontSize: 11 },
});

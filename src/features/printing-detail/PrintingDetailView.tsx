import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { PrintingDetail, PrintingState } from '@/data/printingDetail';
import type { ExchangeRate } from '@/domain/exchangeRates';
import type { PrintingHistory } from '@/data/prices';
import type { IsoDate } from '@/domain/dates';
import { SOURCE_CURRENCY, type Currency, type PriceSource } from '@/domain/price';
import type { ChartPeriod, CustomChartPeriod } from '@/domain/settings';
import {
  defaultCell,
  priceCells,
  productUrl,
  type CellKey,
  type PriceCell,
} from '@/domain/printingDetail';
import type { PrintingCode } from '@/domain/printingCode';
import { controlStyles } from '@/ui/controls';
import { formatDate, formatIsoDate, formatPrice } from '@/ui/format';
import {
  domainLabel,
  FINISH_LABELS,
  PRICE_SOURCE_LABELS,
  rarityLabel,
  typeLabel,
  VARIANTS,
} from '@/ui/labels';
import { CARD_ASPECT_RATIO, gridImageUri } from '@/ui/printing-grid/gridPrinting';
import { colors } from '@/ui/theme';

import { PriceHistorySection } from './PriceHistorySection';

type Props = {
  detail: PrintingDetail;
  state: PrintingState;
  displayCurrency: Currency;
  /** Source de prix des Réglages : celle de la case affichée à l'ouverture. */
  priceSource: PriceSource;
  rates: readonly ExchangeRate[];
  /** Relevés de prix de la Version, pour le graphique d'évolution. */
  history: PrintingHistory;
  today: IsoDate;
  /** Période du graphique, retenue d'une fiche à l'autre (réglage). */
  chartPeriod: ChartPeriod;
  onChartPeriodChange: (period: ChartPeriod) => void;
  pickDates: () => Promise<CustomChartPeriod | null>;
  onBack: () => void;
  onOpenPrinting: (printingCode: PrintingCode) => void;
  onOpenUrl: (url: string) => void;
  onQuantityChange: (quantity: number) => void;
  onWishlistChange: (wishlisted: boolean) => void;
  onBinderSelectionChange: (selected: boolean) => void;
};

const otherSource = (source: PriceSource): PriceSource =>
  source === 'tcgplayer' ? 'cardmarket' : 'tcgplayer';

const sameCell = (a: CellKey | undefined, b: CellKey) =>
  a?.source === b.source && a.finish === b.finish;

/**
 * Fiche d'une Version, mise en page A (spec § 2.2). Toucher une case de prix
 * change le prix affiché de cette fiche seulement : le choix n'est pas retenu.
 */
export function PrintingDetailView({
  detail,
  state,
  displayCurrency,
  priceSource,
  rates,
  history,
  today,
  chartPeriod,
  onChartPeriodChange,
  pickDates,
  onBack,
  onOpenPrinting,
  onOpenUrl,
  onQuantityChange,
  onWishlistChange,
  onBinderSelectionChange,
}: Readonly<Props>) {
  const cells = priceCells(detail.finishes, detail.prices, displayCurrency, rates);
  const [selected, setSelected] = useState(() => defaultCell(detail.finishes, priceSource));
  const shown = cells.find((cell) => sameCell(selected, cell));
  const source = shown?.source ?? priceSource;
  // « Comparer avec l'autre source » : décochée à chaque fiche.
  const [compare, setCompare] = useState(false);
  const url = productUrl(source, detail);
  const image = detail.imageLarge ?? detail.imageNormal ?? detail.imageSmall;
  const gridUri = gridImageUri(detail);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.topBar}>
        <IconButton label="Retour" icon="←" onPress={onBack} />
        <IconButton
          label={`Ouvrir sur ${PRICE_SOURCE_LABELS[source]}`}
          icon="↗"
          disabled={url === null}
          onPress={() => url && onOpenUrl(url)}
        />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.imageBox}>
          {image ? (
            <Image
              source={{ uri: image }}
              // L'image de la grille, déjà en cache, s'affiche pendant le chargement.
              placeholder={gridUri ? { uri: gridUri } : undefined}
              placeholderContentFit="contain"
              accessibilityLabel={`Image de ${detail.name}`}
              cachePolicy="disk"
              contentFit="contain"
              style={styles.image}
            />
          ) : (
            <View style={[styles.image, styles.frame]}>
              <Text style={styles.frameText}>{detail.name}</Text>
            </View>
          )}
        </View>

        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.name}>
            {detail.name}
          </Text>
          <Text style={styles.muted}>
            {detail.printingCode} · {rarityLabel(detail.rarity)} · {VARIANTS[detail.variant]}
          </Text>
          <Text accessibilityLabel="Prix affiché" style={styles.bigPrice}>
            {formatPrice(shown?.converted ?? null, displayCurrency)}
          </Text>
          {shown && (
            <Text style={styles.muted}>
              {PRICE_SOURCE_LABELS[shown.source]} · {FINISH_LABELS[shown.finish]}
            </Text>
          )}
        </View>

        {shown && (
          <Section title="Évolution">
            <PriceHistorySection
              source={shown.source}
              finish={shown.finish}
              history={history[shown.source]?.[shown.finish]}
              currency={SOURCE_CURRENCY[shown.source]}
              otherSource={otherSource(shown.source)}
              otherHistory={history[otherSource(shown.source)]?.[shown.finish]}
              otherCurrency={SOURCE_CURRENCY[otherSource(shown.source)]}
              displayCurrency={displayCurrency}
              rates={rates}
              today={today}
              period={chartPeriod}
              onPeriodChange={onChartPeriodChange}
              compare={compare}
              onCompareChange={setCompare}
              pickDates={pickDates}
            />
          </Section>
        )}

        <Section title="Prix">
          <View style={styles.cells}>
            {cells.map((cell) => (
              <PriceCellButton
                key={`${cell.source}-${cell.finish}`}
                cell={cell}
                displayCurrency={displayCurrency}
                selected={sameCell(selected, cell)}
                onPress={() => setSelected({ source: cell.source, finish: cell.finish })}
              />
            ))}
          </View>
          {cells.length === 0 && (
            <Text style={styles.note}>
              Aucun prix connu : les finitions de cette version ne sont pas renseignées.
            </Text>
          )}
          {shown && <PriceDates cell={shown} />}
          {cells.length > 0 && (
            <Text style={styles.note}>Cardmarket : toutes langues et tous états confondus.</Text>
          )}
        </Section>

        {detail.otherPrintings.length > 0 && (
          <Section title="Autres versions">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.others}>
                {detail.otherPrintings.map((other) => (
                  <Pressable
                    key={other.printingCode}
                    accessibilityRole="button"
                    accessibilityLabel={`${other.printingCode}, ${other.name}`}
                    onPress={() => onOpenPrinting(other.printingCode)}
                    style={styles.other}
                  >
                    <Image
                      source={{ uri: gridImageUri(other) ?? undefined }}
                      cachePolicy="disk"
                      contentFit="cover"
                      style={styles.otherImage}
                    />
                    <Text style={styles.muted}>{other.printingCode}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </Section>
        )}

        <Section title="Détails">
          <DetailRow label="Extension" value={detail.expansionName} />
          <DetailRow label="Numéro" value={detail.collectorNumber} />
          <DetailRow label="Rareté" value={rarityLabel(detail.rarity)} />
          <DetailRow label="Version" value={VARIANTS[detail.variant]} />
          <DetailRow label="Type" value={typeLabel(detail.type)} />
          <DetailRow label="Domaines" value={detail.domains.map(domainLabel).join(', ') || '—'} />
          <DetailRow
            label="Finitions"
            value={detail.finishes.map((f) => FINISH_LABELS[f]).join(', ') || '—'}
          />
          <DetailRow label="Artiste" value={detail.artist ?? '—'} />
        </Section>
      </ScrollView>

      <ActionBar
        state={state}
        onQuantityChange={onQuantityChange}
        onWishlistChange={onWishlistChange}
        onBinderSelectionChange={onBinderSelectionChange}
      />
    </SafeAreaView>
  );
}

function PriceCellButton({
  cell,
  displayCurrency,
  selected,
  onPress,
}: Readonly<{
  cell: PriceCell;
  displayCurrency: Currency;
  selected: boolean;
  onPress: () => void;
}>) {
  const label = `${PRICE_SOURCE_LABELS[cell.source]} ${FINISH_LABELS[cell.finish]}`;
  const original = formatPrice(cell.original, cell.currency);
  const converted = formatPrice(cell.converted, displayCurrency);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${converted}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.cell, selected && styles.cellSelected]}
    >
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={styles.cellPrice}>{converted}</Text>
      {cell.currency !== displayCurrency && cell.original !== null && (
        <Text style={styles.muted}>{original}</Text>
      )}
    </Pressable>
  );
}

function PriceDates({ cell }: Readonly<{ cell: PriceCell }>) {
  if (cell.publishedAt === null)
    return <Text style={styles.note}>Pas de prix pour cette case.</Text>;
  return (
    <Text style={styles.note}>
      Relevé du {formatDate(cell.publishedAt)}
      {cell.rateDate !== null && ` · taux du ${formatIsoDate(cell.rateDate)}`}
    </Text>
  );
}

function ActionBar({
  state,
  onQuantityChange,
  onWishlistChange,
  onBinderSelectionChange,
}: Readonly<
  Pick<Props, 'state' | 'onQuantityChange' | 'onWishlistChange' | 'onBinderSelectionChange'>
>) {
  const wished = state.wishlistedAt !== null;
  return (
    <View style={styles.actions}>
      <View style={styles.quantity}>
        <IconButton
          label="Retirer un exemplaire"
          icon="−"
          disabled={state.quantity === 0}
          onPress={() => onQuantityChange(state.quantity - 1)}
        />
        <Text accessibilityLabel="Quantité possédée" style={styles.quantityValue}>
          {state.quantity}
        </Text>
        <IconButton
          label="Ajouter un exemplaire"
          icon="+"
          onPress={() => onQuantityChange(state.quantity + 1)}
        />
      </View>
      <IconButton
        label={wished ? 'Retirer des souhaits' : 'Ajouter aux souhaits'}
        icon={wished ? '♥' : '♡'}
        onPress={() => onWishlistChange(!wished)}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={state.inBinderSelection ? 'Dans le classeur' : 'Ajouter au classeur'}
        onPress={() => onBinderSelectionChange(!state.inBinderSelection)}
        style={[styles.binder, state.inBinderSelection && controlStyles.selected]}
      >
        <Text style={[styles.binderLabel, state.inBinderSelection && controlStyles.selectedLabel]}>
          {state.inBinderSelection ? 'Dans le classeur' : '+ Classeur'}
        </Text>
      </Pressable>
    </View>
  );
}

function IconButton({
  label,
  icon,
  disabled = false,
  onPress,
}: Readonly<{ label: string; icon: string; disabled?: boolean; onPress: () => void }>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={[styles.iconButton, disabled && styles.disabled]}
    >
      <Text style={styles.icon}>{icon}</Text>
    </Pressable>
  );
}

function Section({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function DetailRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <View style={styles.detail}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  content: { padding: 16, gap: 20, paddingBottom: 32 },
  imageBox: {
    width: '80%',
    alignSelf: 'center',
    aspectRatio: CARD_ASPECT_RATIO,
    borderRadius: 14,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%', backgroundColor: colors.line },
  frame: { alignItems: 'center', justifyContent: 'center', padding: 16 },
  frameText: { color: colors.text, fontSize: 16, textAlign: 'center' },
  heading: { gap: 4 },
  name: { color: colors.text, fontSize: 22, fontWeight: '700' },
  muted: { color: colors.muted, fontSize: 13 },
  bigPrice: { color: colors.accent, fontSize: 30, fontWeight: '700', marginTop: 6 },
  section: { gap: 8 },
  sectionTitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cells: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    ...controlStyles.idle,
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  cellSelected: { borderColor: colors.accent },
  cellLabel: { color: colors.muted, fontSize: 12 },
  cellPrice: { color: colors.text, fontSize: 17, fontWeight: '600' },
  note: { color: colors.muted, fontSize: 12 },
  others: { flexDirection: 'row', gap: 10 },
  other: { width: 96, gap: 4 },
  otherImage: {
    width: 96,
    aspectRatio: CARD_ASPECT_RATIO,
    borderRadius: 8,
    backgroundColor: colors.line,
  },
  detail: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  detailValue: { color: colors.text, fontSize: 14, flexShrink: 1, textAlign: 'right' },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  quantity: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quantityValue: { color: colors.text, fontSize: 17, minWidth: 24, textAlign: 'center' },
  iconButton: {
    ...controlStyles.idle,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  icon: { color: colors.text, fontSize: 18 },
  binder: {
    ...controlStyles.idle,
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    paddingVertical: 10,
  },
  binderLabel: { color: colors.text, fontSize: 14 },
});

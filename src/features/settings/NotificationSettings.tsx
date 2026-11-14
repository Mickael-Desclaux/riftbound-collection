import { useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { isValidSetting } from '@/domain/settings';
import { Button, makeControlStyles } from '@/ui/controls';
import { formatEditableNumber } from '@/ui/format';
import { type Palette, useThemedStyles, usePalette } from '@/ui/theme';

type Props = {
  newExpansions: boolean;
  onNewExpansionsChange: (enabled: boolean) => void;
  priceAlerts: boolean;
  onPriceAlertsChange: (enabled: boolean) => void;
  /** Seuil de baisse, en %, qui déclenche une Alerte de prix d'un souhait. */
  priceAlertThreshold: number;
  onPriceAlertThresholdChange: (threshold: number) => void;
  priceRiseAlerts: boolean;
  onPriceRiseAlertsChange: (enabled: boolean) => void;
  /** Seuil de hausse, en %, qui déclenche une Alerte de prix d'une Version de la Collection. */
  priceRiseAlertThreshold: number;
  onPriceRiseAlertThresholdChange: (threshold: number) => void;
  /** Android bloque les notifications de l'app : seul le message dans l'app reste. */
  blockedByAndroid: boolean;
  onOpenAndroidSettings: () => void;
};

function Toggle({
  label,
  value,
  onValueChange,
}: Readonly<{ label: string; value: boolean; onValueChange: (value: boolean) => void }>) {
  const colors = usePalette();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.accent, false: colors.line }}
      />
    </View>
  );
}

/** « 15 », « 12,5 » : un seuil valide, sinon `null`. */
function parseThreshold(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && isValidSetting('priceAlertThreshold', value) ? value : null;
}

/** Le seuil en %, enregistré à la fin de la saisie ; une saisie invalide reprend la valeur enregistrée. */
function ThresholdInput({
  label,
  accessibilityLabel,
  value,
  onChange,
}: Readonly<{
  label: string;
  accessibilityLabel: string;
  value: number;
  onChange: (threshold: number) => void;
}>) {
  const styles = useThemedStyles(makeStyles);
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    const parsed = draft === null ? null : parseThreshold(draft);
    if (parsed !== null && parsed !== value) onChange(parsed);
    setDraft(null);
  };
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.threshold}>
        <TextInput
          accessibilityLabel={accessibilityLabel}
          style={styles.input}
          keyboardType="decimal-pad"
          value={draft ?? formatEditableNumber(value)}
          onChangeText={setDraft}
          onEndEditing={commit}
          onSubmitEditing={commit}
          selectTextOnFocus
        />
        <Text style={styles.label}>%</Text>
      </View>
    </View>
  );
}

/** Réglages des notifications (spec § 2.6). */
export function NotificationSettings({
  newExpansions,
  onNewExpansionsChange,
  priceAlerts,
  onPriceAlertsChange,
  priceAlertThreshold,
  onPriceAlertThresholdChange,
  priceRiseAlerts,
  onPriceRiseAlertsChange,
  priceRiseAlertThreshold,
  onPriceRiseAlertThresholdChange,
  blockedByAndroid,
  onOpenAndroidSettings,
}: Readonly<Props>) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      <Toggle
        label="Nouvelles extensions"
        value={newExpansions}
        onValueChange={onNewExpansionsChange}
      />
      <Toggle
        label="Alertes de prix des souhaits"
        value={priceAlerts}
        onValueChange={onPriceAlertsChange}
      />
      {priceAlerts && (
        <ThresholdInput
          label="Baisse d’au moins"
          accessibilityLabel="Seuil des alertes de prix des souhaits, en %"
          value={priceAlertThreshold}
          onChange={onPriceAlertThresholdChange}
        />
      )}
      <Toggle
        label="Hausses de prix de la collection"
        value={priceRiseAlerts}
        onValueChange={onPriceRiseAlertsChange}
      />
      {priceRiseAlerts && (
        <ThresholdInput
          label="Hausse d’au moins"
          accessibilityLabel="Seuil des hausses de prix de la collection, en %"
          value={priceRiseAlertThreshold}
          onChange={onPriceRiseAlertThresholdChange}
        />
      )}
      {blockedByAndroid && (
        <>
          <Text style={styles.hint}>
            Android bloque les notifications de l’app : les nouveautés ne s’affichent que lorsque
            l’app est ouverte.
          </Text>
          <Button label="Autoriser dans Android" onPress={onOpenAndroidSettings} />
        </>
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { gap: 10 },
    title: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 8 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    label: { color: colors.text, fontSize: 14 },
    hint: { color: colors.muted, fontSize: 13 },
    threshold: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    input: {
      ...makeControlStyles(colors).idle,
      color: colors.text,
      borderRadius: 8,
      minWidth: 56,
      paddingHorizontal: 10,
      paddingVertical: 6,
      textAlign: 'right',
    },
  });

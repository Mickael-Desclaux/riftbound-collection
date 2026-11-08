import { Pressable, StyleSheet, Text, View } from 'react-native';

import { paginationItems } from '@/domain/pagination';
import { colors } from '@/ui/theme';

type Props = { page: number; pageCount: number; onPageChange: (page: number) => void };

/** Pagination numérotée : ‹ 1 … 4 5 6 … 72 ›. */
export function Pagination({ page, pageCount, onPageChange }: Props) {
  if (pageCount <= 1) return null;
  return (
    <View style={styles.row}>
      <PageButton
        label="‹"
        accessibilityLabel="Page précédente"
        disabled={page === 1}
        onPress={() => onPageChange(page - 1)}
      />
      {paginationItems(page, pageCount).map((item, index) =>
        item === 'gap' ? (
          <Text key={`gap-${index}`} style={styles.gap}>
            …
          </Text>
        ) : (
          <PageButton
            key={item}
            label={String(item)}
            accessibilityLabel={`Page ${item}`}
            current={item === page}
            onPress={() => onPageChange(item)}
          />
        ),
      )}
      <PageButton
        label="›"
        accessibilityLabel="Page suivante"
        disabled={page === pageCount}
        onPress={() => onPageChange(page + 1)}
      />
    </View>
  );
}

function PageButton(props: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  current?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel}
      accessibilityState={{ disabled: props.disabled, selected: props.current }}
      disabled={props.disabled || props.current}
      onPress={props.onPress}
      style={[styles.button, props.current && styles.current, props.disabled && styles.disabled]}
    >
      <Text style={[styles.label, props.current && styles.currentLabel]}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    padding: 16,
  },
  button: {
    minWidth: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  current: { backgroundColor: colors.accent, borderColor: colors.accent },
  disabled: { opacity: 0.35 },
  label: { color: colors.text, fontSize: 15 },
  currentLabel: { color: colors.background, fontWeight: '700' },
  gap: { color: colors.muted, paddingHorizontal: 4 },
});

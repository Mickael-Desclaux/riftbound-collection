/**
 * Toast d'annulation (spec § 2.1, § 2.4) : un message court en bas de l'écran,
 * avec une action, qui disparaît seul. Un nouveau toast remplace le précédent.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from './theme';

export type ToastMessage = {
  message: string;
  /** Libellé de l'action, ex. « Annuler ». */
  actionLabel: string;
  onAction: () => void;
};

/** Durée d'affichage d'un toast. */
export const TOAST_DURATION_MS = 5_000;

const ToastContext = createContext<(toast: ToastMessage) => void>(() => {});

/** Affiche un toast ; fourni par `ToastProvider`. */
export function useToast(): (toast: ToastMessage) => void {
  return useContext(ToastContext);
}

export function ToastProvider({
  bottomOffset = 0,
  children,
}: Readonly<{
  /** Place à laisser sous le toast (barre d'onglets), en plus de la zone sûre. */
  bottomOffset?: number;
  children: ReactNode;
}>) {
  // `id` : un toast identique affiché deux fois relance sa minuterie.
  const [toast, setToast] = useState<(ToastMessage & { id: number }) | null>(null);
  const show = useCallback(
    (next: ToastMessage) => setToast((current) => ({ ...next, id: (current?.id ?? 0) + 1 })),
    [],
  );
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      <View style={styles.container}>
        {children}
        {toast && (
          <View
            accessibilityLiveRegion="polite"
            style={[styles.toast, { bottom: insets.bottom + bottomOffset + 12 }]}
          >
            <Text style={styles.message}>{toast.message}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setToast(null);
                toast.onAction();
              }}
              hitSlop={8}
            >
              <Text style={styles.action}>{toast.actionLabel}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  message: { flex: 1, color: colors.text, fontSize: 14 },
  action: { color: colors.accent, fontSize: 14, fontWeight: '700' },
});

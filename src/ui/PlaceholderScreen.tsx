import { StyleSheet, Text, View } from 'react-native';

import { colors } from './theme';

type Props = {
  title: string;
  description: string;
};

/** Écran temporaire affiché tant que la fonctionnalité de l'onglet n'est pas construite. */
export function PlaceholderScreen({ title, description }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 8 },
  description: { color: colors.muted, fontSize: 15, textAlign: 'center' },
});

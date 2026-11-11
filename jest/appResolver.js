// Resolver du projet `app`. Sous Jest, Reanimated et Worklets doivent charger
// leur implémentation web pour certains fichiers (doc « Testing » de
// Reanimated) ; tout le reste passe par le resolver de jest-expo.
//
// On n'enchaîne pas directement les resolvers fournis par Reanimated et
// Worklets : celui de Worklets teste `basedir.includes('react-native-worklets')`,
// et avec l'installation isolée de pnpm (CI), le dossier de Reanimated
// s'appelle `react-native-reanimated@x_react-native-worklets@y…`. Tout
// Reanimated perdait alors ses fichiers `.native`. Ici, on compare un vrai
// segment de chemin.
const expoResolver = require(require('jest-expo/jest-preset').resolver);

/**
 * Fichiers de Reanimated chargés en version web sous Jest : liste reprise de
 * `react-native-reanimated/jest/resolver.js` (4.7.1). À revoir à chaque
 * mise à jour de Reanimated.
 */
const REANIMATED_WEB_ONLY = [
  'initializers',
  'mutables',
  'mappers',
  'ConfigHelper',
  'UpdateLayoutAnimations',
  'useAnimatedRef',
  'useAnimatedStyle',
  'WorkletEventHandler',
  'JSPropsUpdater',
  'updateProps',
  'util',
  'css/component/AnimatedComponent',
];

const inPackage = (dir, name) => dir.replaceAll('\\', '/').includes(`/node_modules/${name}/`);

function isReanimatedWebOnly(request, basedir) {
  if (!request.startsWith('.') || !inPackage(basedir, 'react-native-reanimated')) return false;
  const basename = request.split('/').pop();
  return REANIMATED_WEB_ONLY.some((entry) =>
    entry.includes('/') ? request.endsWith(entry) : basename === entry,
  );
}

function isWorklets(request, basedir) {
  return inPackage(basedir, 'react-native-worklets') || request.startsWith('react-native-worklets');
}

/** @type {import('jest-resolve').SyncResolver} */
module.exports = function appResolver(request, options) {
  const webOnly =
    isReanimatedWebOnly(request, options.basedir) || isWorklets(request, options.basedir);
  const extensions = webOnly
    ? options.extensions?.filter((extension) => !extension.includes('native'))
    : options.extensions;
  return expoResolver(request, { ...options, extensions });
};

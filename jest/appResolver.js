// Resolver du projet `app` : celui de Reanimated (implémentation web de
// Worklets et de Reanimated sous Jest), qui retombe ensuite sur celui de
// jest-expo plutôt que sur celui de Jest.
const reanimatedResolver = require('react-native-reanimated/jest/resolver');
const expoResolver = require(require('jest-expo/jest-preset').resolver);

/** @type {import('jest-resolve').SyncResolver} */
module.exports = (request, options) =>
  reanimatedResolver(request, {
    ...options,
    defaultResolver: (next, nextOptions) =>
      expoResolver(next, { ...nextOptions, defaultResolver: options.defaultResolver }),
  });

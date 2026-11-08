const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Les migrations Drizzle sont des fichiers .sql embarqués dans le bundle.
config.resolver.sourceExts.push('sql');

module.exports = config;

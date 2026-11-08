module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Les migrations Drizzle importent leurs fichiers .sql comme du texte.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};

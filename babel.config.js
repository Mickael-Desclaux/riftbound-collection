module.exports = function (api) {
  const isTest = api.env('test');
  api.cache.using(() => isTest);
  return {
    presets: ['babel-preset-expo'],
    // Dans l'app, les migrations Drizzle embarquent leurs fichiers .sql comme du
    // texte. Sous Jest, c'est jest/sqlTransformer.js qui s'en charge.
    plugins: isTest ? [] : [['inline-import', { extensions: ['.sql'] }]],
  };
};

// Sous Jest, chaque fichier .sql devient un module qui exporte son texte.
// Jest met en cache selon le contenu du fichier : une migration modifiée est
// donc toujours relue (ce que ne garantit pas babel-plugin-inline-import).
module.exports = {
  process(sourceText) {
    return { code: `module.exports = ${JSON.stringify(sourceText)};` };
  },
};

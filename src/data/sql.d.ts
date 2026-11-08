// Fichiers .sql importés comme texte (babel-plugin-inline-import).
declare module '*.sql' {
  const sql: string;
  export default sql;
}

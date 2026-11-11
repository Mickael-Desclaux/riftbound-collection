// Délai des tests d'interface. Le premier rendu d'un fichier transforme à la
// volée les modules React Native qu'il touche : sur la CI, sans cache et avec
// les suites en parallèle, il dépasse parfois les 5 s par défaut.
// (`testTimeout` est une option globale de Jest : dans un projet, elle est ignorée.)
jest.setTimeout(15_000);

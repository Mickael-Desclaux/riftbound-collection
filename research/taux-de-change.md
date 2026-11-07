# Source de taux de change (USD / EUR / CAD)

Recherche pour l'issue #4. Contexte : app Android v2 (Expo + SQLite, usage perso, pas de serveur). Les prix natifs sont en USD (TCGplayer) ou EUR (Cardmarket). On les affiche en CAD, USD ou EUR. Un historique de prix local existera, donc il faut aussi les taux passés.

Tous les appels ci-dessous ont été faits avec `curl` le 2026-11-07 (un samedi).

## Tableau comparatif

| Source | Clé | Marche ? | USD/EUR/CAD | Historique | Mise à jour | Week-ends / fériés | Limites | Conditions |
|---|---|---|---|---|---|---|---|---|
| **Frankfurter** (`api.frankfurter.dev`) | Non | Oui | Oui | Oui, plage de dates en une requête (BCE depuis 1999) | Quotidienne (BCE ~16:00 CET) | v1 / fournisseur `ecb` : jours ouvrés seulement, une date de week-end renvoie le dernier jour ouvré | Pas de quota, juste un anti-abus | Open source (MIT), usage commercial OK, mise en cache locale « encouragée » |
| **Banque du Canada Valet** | Non | Oui | Oui (`FXUSDCAD`, `FXEURCAD`) | Oui, `start_date`/`end_date`, depuis 2017-01-03 | Jours ouvrés, avant 16:30 ET | Jours ouvrés canadiens seulement, pas de valeur les autres jours | Non documentées | Réutilisation libre, avec attribution |
| **BCE en direct** (`eurofxref` XML, `data-api.ecb.europa.eu`) | Non | Oui | Oui (base EUR) | Oui (SDMX, depuis 1999) | ~16:00 CET | Pas de cotation les jours de fermeture TARGET | Non documentées | Taux « à titre d'information » |
| **open.er-api.com** (ExchangeRate-API) | Non | Oui | Oui | **Non** (dernier taux seulement) | 1×/jour (~00:00 UTC) | Mis à jour tous les jours | Limité au-delà d'environ 1 requête/heure | Attribution obligatoire, pas de redistribution |
| **fawazahmed0 currency-api** (jsDelivr / Cloudflare Pages) | Non | Oui | Oui | Un fichier par date (depuis 2024-03-06), pas de plage | Quotidienne | Un fichier pour chaque jour | « Pas de limite » (CDN) | Projet perso, source agrégée floue |
| **exchangerate.host** | **Oui** | Non sans clé | Oui | Oui (payant au-delà de l'offre gratuite) | — | — | **100 requêtes/mois** sur l'offre gratuite | Racheté par APILayer : plus gratuit ni sans clé |

## Détails

### Frankfurter — recommandé
- Doc : <https://frankfurter.dev/>, v1 : <https://frankfurter.dev/v1/>, code : <https://github.com/lineofflight/frankfurter>, licence : <https://frankfurter.dev/license/> (MIT).
- `GET https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,CAD` → `{"base":"USD","date":"2026-11-06","rates":{"CAD":1.4066,"EUR":0.89566}}`. On peut choisir la base, donc USD→CAD et EUR→CAD se lisent directement.
- Plage de dates : `/v1/2026-10-25..2026-11-06?base=USD&symbols=EUR,CAD` renvoie un objet par jour ouvré. Un début qui tombe un dimanche est ramené au vendredi précédent (`start_date: 2026-10-23`).
- Date de week-end : `/v1/2026-11-01` (dimanche) → `date: 2026-10-30` (vendredi). Le champ `date` de la réponse donne la date effective.
- Historique BCE depuis 1999-01-04 (vérifié).
- **v2** : `GET /v2/rates?base=USD&quotes=EUR,CAD`. Par défaut, elle mélange les taux de 108 banques centrales et inclut des dates de week-end. Petite bizarrerie relevée : le samedi 2026-11-07, elle renvoyait `date: 2026-11-08`. Pour des données officielles et stables, la doc conseille d'interroger un fournisseur précis : `/v2/providers/ecb/rates?...` (BCE) ou `/v2/providers/boc/rates` (Banque du Canada). La v1 est dépréciée mais « reste disponible indéfiniment » (FAQ).
- FAQ (<https://frankfurter.dev/>) : pas de quota, un simple anti-abus, stocker les taux localement est encouragé, aucun log de données personnelles (rien à déclarer dans la fiche Google Play), usage commercial autorisé.
- `cache-control: max-age=86400`, derrière Cloudflare. L'ancien domaine `api.frankfurter.app` renvoie une redirection 301 : il faut utiliser `api.frankfurter.dev`.
- Longévité : projet existant depuis 2018 et toujours actif. On peut l'auto-héberger (Docker) s'il disparaît, et la source sous-jacente (BCE) est publique.

### Banque du Canada Valet — meilleur secours pour le CAD
- Doc : <https://www.bankofcanada.ca/valet/docs>, taux : <https://www.bankofcanada.ca/rates/exchange/daily-exchange-rates/>, conditions : <https://www.bankofcanada.ca/terms/>.
- `GET https://www.bankofcanada.ca/valet/observations/FXUSDCAD,FXEURCAD/json?recent=3` ou `?start_date=…&end_date=…`. Les valeurs sont des chaînes (`"v":"1.4113"`) exprimées en CAD pour 1 unité de devise.
- « Publiés une fois par jour ouvré avant 16:30 ET ». Pas d'observation les week-ends et jours fériés canadiens (le 2026-10-31 et le 2026-11-01 sont absents). Série depuis 2017-01-03.
- Pas de paire USD↔EUR directe : on la calcule par le CAD (`FXEURCAD / FXUSDCAD`).
- Ce sont des taux indicatifs (moyenne de cotations). Ils diffèrent légèrement de ceux de la BCE (USD/CAD le 2026-11-06 : 1.4113 BdC contre 1.4066 BCE).

### BCE en direct
- <https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml> (XML) et l'API SDMX `https://data-api.ecb.europa.eu/service/data/EXR/D.USD+CAD.EUR.SP00.A?startPeriod=…&format=csvdata`. Les deux fonctionnent.
- « Mis à jour vers 16:00 CET chaque jour ouvré, sauf les jours de fermeture TARGET », taux « à titre d'information » ([page BCE](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html)).
- C'est la même donnée que Frankfurter, mais en XML/CSV avec base EUR imposée. C'est utile seulement si Frankfurter tombe.

### open.er-api.com
- <https://www.exchangerate-api.com/docs/free>. `GET https://open.er-api.com/v6/latest/USD` fonctionne et donne `time_next_update_utc`.
- Pas d'historique, attribution obligatoire, redistribution interdite. Sans risque à 1 requête/jour, mais inutile pour la courbe de prix.

### fawazahmed0/exchange-api
- <https://github.com/fawazahmed0/exchange-api>. `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@{latest|YYYY-MM-DD}/v1/currencies/usd.json`, plus un miroir `https://latest.currency-api.pages.dev/…`. Le README demande d'implémenter la bascule vers ce miroir.
- Les fichiers datés existent depuis 2024-03-06 (le 2024-03-01 renvoie 404). Il n'y a pas de requête par plage : il faut un fichier par jour. Projet d'une seule personne, données agrégées sans source officielle claire.

### exchangerate.host
- Toute requête sans `access_key` renvoie `missing_access_key` (code 101). L'offre gratuite est de 100 requêtes/mois (<https://exchangerate.host/>). **À écarter.**

## Recommandation

1. **Source principale : Frankfurter, données BCE.** On peut utiliser `/v1/` (simple, jours ouvrés seulement) ou l'équivalent v2 `/v2/providers/ecb/rates`. Il couvre les trois devises, les plages historiques en une requête, sans clé ni quota, sous licence MIT. Il est auto-hébergeable si besoin. Éviter le mode « mélangé » par défaut de la v2 pour l'historique, car il est moins stable et renvoie des dates étranges.
2. **Secours : Banque du Canada Valet** (`FXUSDCAD`, `FXEURCAD`). La source est officielle et indépendante, avec un historique par plage et sans clé. On calcule USD↔EUR via le CAD. Si Frankfurter est indisponible, une requête directe à l'API BCE est un second secours possible.
3. **Stratégie dans l'app :**
   - Stocker dans SQLite une table `fx_rate(date, base, quote, rate, source)` avec un seul jeu de taux par jour ouvré (base USD → EUR, CAD suffit ; EUR→X se déduit).
   - Rafraîchir au plus une fois par jour. Au premier lancement, ou pour combler un trou, une seule requête par plage suffit.
   - **Week-ends et jours fériés** : pour un relevé de prix daté D, utiliser le dernier taux connu à une date ≤ D (*carry forward*). C'est ce que fait déjà Frankfurter v1.
   - Hors ligne : utiliser le dernier taux en cache et afficher sa date.
   - Ne pas mélanger les sources dans une même série. Enregistrer `source` pour chaque taux.

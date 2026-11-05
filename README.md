# Pokémon Kanto — Collection et combats tactiques

Projet JavaScript avec RxJS, Vite et PokéAPI. Les données sont limitées aux 151 Pokémon de la première génération.

## Lancer dans Ubuntu

```bash
cd ~/projets/mon-projet
npm run dev
```

Ouvre http://localhost:5173. Le script `./scripts/start.sh` fonctionne également.
Les dépendances sont installées ; sur une nouvelle copie du projet, lance `npm ci`.
Si npm est introuvable : `source ~/.nvm/nvm.sh`.
Pour ouvrir dans VS Code : `code .`.

## Aventure et sauvegarde

Le deck initial contient Bulbasaur, Charmander, Squirtle, Pidgey et Rattata, tous au niveau 1.
Un nouveau profil commence avec 0 or, 0 XP et aucun booster.

Les **100 dresseurs** sont répartis sur **10 régions illustrées**, avec une difficulté et des niveaux croissants. Seule la prochaine rencontre est jouable : 1, puis 2, puis 3. Les régions suivantes peuvent être regardées, mais leurs combats restent verrouillés. Une victoire déplace le marqueur vers le dresseur suivant ; une défaite permet de réessayer sans frais.

Chaque victoire donne plusieurs récompenses :

| Difficulté | Or de base | XP de base |
| --- | ---: | ---: |
| Facile (1–30) | 10 | 25 |
| Moyen (31–70) | 30 | 60 |
| Difficile (71–100) | 100 | 150 |

Ajoute un bonus aléatoire de **5 à 20 or**, **5 à 25 XP** et **1 ou 2 cartes**, dont un double garanti tiré parmi les Pokémon possédés. Toutes les dix étapes, le gardien donne **3 cartes** et **50 or / XP supplémentaires**. Ces récompenses sont enregistrées ensemble avec la prochaine étape ; la même victoire ne peut jamais être payée deux fois. Les tirages restent identiques pendant une nouvelle tentative de sauvegarde.

Les boosters s’obtiennent uniquement par achat. L’or reste visible en haut à droite, dans tous les modes.
La barre d’XP montre la progression vers le prochain niveau de profil : 100 XP pour passer du niveau 1 au niveau 2, puis 200 XP pour atteindre le niveau 3, etc.

Les cartes, niveaux, deck, stocks, or et XP sont sauvegardés dans le navigateur sous la clé `pokemon-kanto-profile-v1` (format de données version 5).
La migration conserve les anciennes cartes, niveaux, monnaies, équipes et boosters déjà possédés ; les anciens boosters sont convertis en boosters Découverte. La route reprend après les victoires consécutives déjà obtenues depuis le premier dresseur, sans sauter les rencontres manquantes.
La sauvegarde dépend de l’appareil, du navigateur et de l’adresse : localhost et 127.0.0.1 ont des sauvegardes distinctes.
Une récompense ne peut être créditée qu’une seule fois par combat. Les achats et les attaques donnant de l’XP ne sont appliqués qu’après sauvegarde réussie. Les anciens niveaux améliorés sont convertis en XP au seuil du même niveau : aucune capacité acquise n’est perdue. Les exemplaires déjà possédés, dont le cadeau de dix Mew, sont conservés, mais ne servent plus à améliorer les Pokémon.

## Les 60 dresseurs en combat libre

En plus du mode aventure, l’onglet **Dresseurs** donne accès à **60 adversaires au choix : exactement 4 par niveau, du niveau 1 au niveau 15**, présentés dans cet ordre. Les niveaux **1 à 5 sont faciles**, **6 à 10 moyens**, **11 à 15 difficiles** (20 dresseurs par difficulté). Les boutons de niveau permettent de rejoindre directement un groupe. Les 5 Pokémon adverses utilisent le niveau affiché, y compris jusqu’au niveau 15 ; les statistiques augmentent réellement avec ce niveau. Les anciens identifiants de dresseurs et leurs victoires sont conservés. Ils sont tous disponibles immédiatement et rejouables à volonté, avec les portraits, le robot et les quatre attaques par Pokémon.

Les récompenses des combats libres augmentent **à chaque niveau** : **or = 10 × niveau du dresseur**, **XP = 25 × niveau du dresseur**. Le même calcul sert à l’affichage et au versement sauvegardé.

| Niveau | Or par victoire | XP par victoire |
| --- | ---: | ---: |
| 1 | 10 | 25 |
| 5 | 50 | 125 |
| 10 | 100 | 250 |
| 15 | 150 | 375 |

 Les revanches sont payées aussi ; une même attribution de combat ne peut être enregistrée qu’une fois. Les combats libres ne donnent ni carte ni booster et ne débloquent aucune étape de la route. L’or sert à acheter des boosters ; les montées de niveau Pokémon sont gratuites. Les dresseurs libres déjà vaincus sont sauvegardés séparément ; les anciennes sauvegardes restent compatibles.

## Boutique de boosters

| Booster | Pokémon | Prix |
| --- | ---: | ---: |
| Découverte | 5 | 50 or |
| Super | 10 | 90 or |
| Hyper | 15 | 130 or |

Achète un booster avant de pouvoir l’ouvrir. L’ouverture consomme un booster et donne 5, 10 ou 15 résultats. Chaque tirage débloque un Pokémon encore inconnu, sans répétition tant qu’il en reste ; les nouvelles recrues commencent au niveau 1, à 0 XP. Une fois les 151 Pokémon découverts, les tirages déjà connus n’ajoutent ni XP, ni niveau, ni statistiques. Les niveaux des Pokémon possédés restent intacts. Les nouvelles recrues peuvent remplacer un Pokémon du deck sans supprimer celui qui en sort.

## XP individuelle et capacités jusqu’au niveau 100

Chaque Pokémon possède sa propre XP, visible sur sa carte de collection, dans le deck et dans son équipe de combat. Seul le Pokémon qui met la cible K.O. gagne de l’XP : la récompense augmente avec **le niveau et les six statistiques de base du Pokémon vaincu**. Le calcul est `arrondi((25 + 5 × (niveau adverse − 1)) × somme des statistiques de base / 330)`, avec un minimum de 1 XP. À espèce identique, chaque niveau adverse rapporte davantage ; à niveau identique, une espèce aux meilleures statistiques rapporte davantage. Les PV restants et la protection ne changent pas la récompense. Le montant exact est affiché sur le Pokémon adverse pendant le combat, puis crédité au finisseur. Les quatre attaques peuvent rapporter de l’XP si elles donnent le coup final. Une attaque sans K.O., une immunité ou une attaque bloquée faute de charge ne rapporte rien. Un Pokémon qui a seulement affaibli la cible ne reçoit aucune part de l’XP. La protection, les changements, le banc et les actions du robot ne donnent aucune XP aux Pokémon possédés. Les récompenses d’XP de victoire concernent le profil du joueur, séparément.

Le seuil total du niveau `n` vaut `100 × (n−1) × n / 2`. Le passage du niveau 1 au niveau 2 demande 100 XP, puis 200 XP pour le niveau 3, etc. Les seuils sont quatre fois plus élevés que dans la première version du système d’XP, Les gains sont désormais réservés aux K.O. Les sauvegardes version 4 sont converties une seule fois en multipliant l’XP Pokémon par quatre afin de conserver le niveau et le pourcentage de la barre déjà acquis. L’XP est plafonnée au niveau 100. Chaque niveau ajoute **10 % des statistiques de base** aux six capacités, avec arrondi à l’entier et PV ×3. Une montée de niveau s’applique dès l’attaque terminée : la charge et les blessures sont conservées, seuls les PV maximum supplémentaires sont ajoutés aux PV courants. Un Pokémon K.O. reste K.O.

Dans **Ma collection**, le bouton **Capacités & progression** montre les quatre attaques, les faiblesses et résistances, la barre d’XP, les six statistiques actuelles et du prochain niveau, ainsi que les gains de dégâts estimés contre une cible neutre à 60 de défense et défense spéciale. Il n’y a plus de bouton d’achat d’amélioration, de coût en or ou de doubles à consommer.

L’XP de l’attaquant et un reçu de l’action sont sauvegardés ensemble après chaque K.O. Elle reste acquise après une défaite, un retour à la route ou un rechargement ; une même attaque n’est jamais créditée deux fois. En cas d’échec de sauvegarde, l’attaque est annulée. Le combat local à deux joueurs reste une partie indépendante sans progression persistante.

## Combats tactiques

Chaque équipe comporte 5 Pokémon. Les PV sont multipliés par 3.
Les cartes ont une jauge de charge individuelle, initialement à 0 et plafonnée à 3.

Chaque Pokémon dispose de **quatre techniques propres aux règles de ce jeu**, adaptées à ses types (ce ne sont pas les listes de capacités des jeux officiels) :

1. **Coup rapide** : physique de type Normal, puissance ×1 ; donne 1 charge.
2. **Frappe de type** : physique du premier type du Pokémon, puissance ×0,85 ; donne 1 charge.
3. **Vague de type** : spéciale du second type (ou du premier s’il est seul), puissance ×1,15 ; coûte 2 charges.
4. **Déferlante ultime** : spéciale du type du Pokémon le plus efficace contre la cible, puissance ×1,6 ; coûte 3 charges.

- **Se protéger** : consomme le tour, donne 1 charge et réduit de moitié la prochaine attaque reçue.

La charge est conservée quand un Pokémon revient sur le banc. Les résistances, faiblesses et immunités s’appliquent aux dégâts. Utiliser son propre type donne un bonus ×1,25.
Les dégâts sont calculés à partir de `max(1, attaque - floor(defense / 2))`, avec les statistiques physiques ou spéciales correspondantes, puis les multiplicateurs de type, de puissance, d’affinité et de protection. Une immunité inflige 0 dégât.
Le chiffre affiché sur un bouton est la prévision avant plafonnement aux PV restants de la cible.

Le robot respecte la charge : les adversaires moyens choisissent leurs meilleures attaques disponibles ; les difficiles évaluent aussi la survie, les K.O. et l’intérêt d’une protection.
Un Pokémon K.O. est remplacé automatiquement. Mettre les 5 Pokémon adverses K.O. remporte la partie.
Une défaite ou un abandon ne retire ni or ni carte.

Le mode **Combat à 2** permet de jouer sur le même écran avec une distribution aléatoire et les mêmes nouvelles actions, sans récompenses de campagne.
Le **Pokédex** reste accessible avec son catalogue paginé et ses fiches.

## Visuels et données

La bannière, les dix paysages et les 15 portraits sont des images créées avec l’outil intégré imagegen.
Les portraits sont une grille de 5 colonnes sur 3 rangées, affichée par position CSS et réutilisée pour les 100 personnages nommés. Les dix paysages sont un atlas de deux colonnes sur cinq rangées ; chaque région en affiche une zone. Le chemin, les verrouillages et le marqueur du joueur sont dessinés par le code.
Les fichiers sont dans `assets/images/`, avec les prompts et chemins enregistrés dans `GENERATED-ASSETS.md`.

Les relations de types proviennent des données sources de [PokéAPI](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/type_efficacy.csv) et sont mises en cache dans `src/js/type-chart.js`.
Les images et fiches des Pokémon proviennent de [PokéAPI](https://pokeapi.co/docs/v2#pokemon).

## Organisation et validation

- `battle-model.js` : actions, charge, dégâts, types et victoire.
- `bot.js` : choix du robot.
- `progression-model.js` : inventaire, boutique, reçus d’attaques, XP individuelle et migration.
- `adventure-map.js` et `adventure.css` : route, paysages, portraits, verrouillages et portefeuille persistant.
- `campaign.js` : événements RxJS, sauvegarde et interface de campagne.
- `pokemon-levels.js` : seuils des 100 niveaux, gains par K.O. et barres d’XP.
- `card-info.js` : capacités et comparaison avant/après.
- `refinement.css` : bannière, XP, boutique, portraits et présentation du combat.

```bash
npm test
npm run build
npm run preview
```

La version compilée est dans `dist/`. La prévisualisation est disponible sur http://localhost:4173.
Les tests couvrent les 100 rencontres dans l’ordre, les récompenses aléatoires, les quatre attaques, la charge, les types, la protection, les K.O., la stratégie du robot, les achats et ouvertures de boosters, l’XP réservée au Pokémon qui porte le coup final, le plafond au niveau 100, la sauvegarde et sa migration.

## Prestige visuel des dresseurs

Les niveaux 1–3 ont un style vert Novice ; 4–6 bleu Confirmé ; 7–9 violet Expert ; 10–12 rubis Élite ; 13–14 or Maître ; 15 bleu nuit et doré Légendaire. Les couleurs évoluent aussi à l’intérieur des paliers. Cadres, emblèmes et récompenses colorées rendent la montée en niveau visible. Cette présentation est réalisée en CSS et SVG, réutilise les portraits existants et respecte la réduction des animations.

## Menu de navigation

Le menu Aventure / Dresseurs / Collection / Boutique est placé avant la bannière, avec de grands boutons colorés et des icônes. L’onglet actif est rempli dans sa couleur. Le bandeau avec l’or et le menu restent à leur place au début de la page : ils défilent hors de l’écran quand on descend et reviennent quand on remonte. Les sauts de niveau et changements d’onglet n’ont donc aucun bandeau flottant au-dessus du contenu.

## Neuf personnages sélectionnables

L’onglet **Personnages** permet de sélectionner gratuitement un personnage, ou de jouer sans personnage. Un seul peut être équipé. Le choix est sauvegardé dans le profil et les anciennes sauvegardes gardent leurs valeurs jusqu’à une sélection.

| Personnage | Bonus |
| --- | --- |
| Aurore | +25 % de PV sur les cinq Pokémon |
| Kael | +20 % de dégâts physiques |
| Lyra | +25 % de dégâts spéciaux (Vague et ultime) |
| Milo | +40 % d’or gagné |
| Énora | +50 % d’XP gagnée |
| Bastien | −15 % de dégâts reçus |
| Naya | Une charge initiale par Pokémon |
| Soren | +10 % de PV et de tous les dégâts |
| Tess | +20 % d’or et d’XP |

Les bonus fonctionnent en aventure et dans les combats libres. Le choix est capturé au lancement du combat pour les cinq cartes et pour l’attribution des récompenses : changer de personnage dans un autre onglet ne change pas un combat en cours. Les changements sont bloqués pendant un combat. Les PV et dégâts prévus de la collection et les récompenses affichées des dresseurs incluent le personnage. Les valeurs finales sont arrondies à l’entier le plus proche. Le combat local à deux joueurs conserve ses règles de base.

Les neuf portraits sont un atlas original créé avec l’outil intégré imagegen, conservé dans `assets/images/characters-atlas-v1.png`. Le prompt complet est dans `assets/images/GENERATED-ASSETS.md` et dans la copie Windows `assets-generated/characters-atlas-v1.json`.


## Kanto Odyssée : accueil, journal et confort de jeu

L’accueil présente la prochaine région, le prochain adversaire, la carte de dresseur et les trois missions quotidiennes. Le journal suit les victoires, défaites, séries, K.O. et ouvertures de boosters ; il présente 14 succès à réclamer, 10 badges de région et les 12 derniers événements. Les objectifs donnent de l’or et de l’XP de profil, jamais d’XP Pokémon ni de boosters gratuits. Les gains sont vérifiés et enregistrés une seule fois. Les missions quotidiennes se renouvellent à la date locale sans effacer les statistiques permanentes.

Le sac initial comprend 3 potions et 1 éther, ajoutés une seule fois à une sauvegarde ancienne. La boutique vend Potion (15 or, 35 % PV max), Super Potion (35 or, 70 % PV max), Éther (25 or, +1 charge). Un objet ne peut servir qu’au Pokémon actif vivant pendant le tour du joueur et consomme ce tour. Il ne donne aucune XP et ne ressuscite pas un Pokémon K.O. Un objet inutile n’est pas consommé.

La collection propose recherche par nom/numéro, filtres équipe/favoris, tris par numéro/nom/niveau, types et cadres de rareté décoratifs. Les favoris sont sauvegardés. Le header et le menu restent dans le flux de la page conformément au choix du joueur. Les arènes utilisent les paysages existants, avec retours visuels, effets de coups, apparitions des cartes et des résultats. Le mode animations réduites respecte aussi le réglage du système. Les sons de synthèse sont désactivés par défaut et activables dans les réglages.

Les réglages permettent l’export JSON de la progression et l’import avec validation et aperçu avant remplacement. Une sauvegarde illisible est refusée sans écraser le profil. Les niveaux, XP, cartes, or et anciens cadeaux sont conservés. Le guide explique les combats et les nouveaux systèmes.

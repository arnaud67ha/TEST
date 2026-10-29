# Secret Santa — cadrage du besoin

## Contexte
Petit groupe (famille ou amis, 3 à 20 personnes) qui organise un échange de cadeaux
à Noël. Tout le monde est réuni au même endroit au moment du tirage.

## Objectif
Faire le tirage au sort sur **un seul appareil que l'on se passe** : chacun découvre
en privé la personne à qui il offre un cadeau, sans que les autres (ni l'organisateur)
voient le résultat.

## Utilisateurs
- **Organisateur** : saisit l'événement, les participants et les règles, lance le tirage.
- **Participant** : prend l'appareil, choisit son nom, découvre son destinataire, rend l'appareil.

## Périmètre (v1)

| # | Fonctionnalité | Détail |
|---|----------------|--------|
| 1 | Événement | Nom, budget maximum (€), date de l'échange — affichés à chaque participant. |
| 2 | Participants | Ajouter / retirer des prénoms. Minimum 3, noms uniques (insensible à la casse). |
| 3 | Exclusions | Interdire qu'une personne tire une autre (ex. un couple). Par défaut dans les deux sens. |
| 4 | Tirage | Personne ne se tire soi-même, exclusions respectées, chacun donne et reçoit exactement un cadeau. Message clair si les règles rendent le tirage impossible. |
| 5 | Révélation | Liste des prénoms → confirmation « C'est bien toi ? » → appui pour révéler → « J'ai retenu, cacher ». Le prénom est ensuite marqué comme vu et ne peut plus être rouvert. |
| 6 | Reprise | Le tirage survit à un rechargement de la page (stockage local du navigateur). |
| 7 | Réinitialisation | Refaire un tirage ou tout recommencer, avec confirmation. |

## Hors périmètre (v1)
- Envoi par e-mail / SMS, liens personnels, comptes utilisateurs, serveur.
- Listes de souhaits, anti-répétition d'une année sur l'autre.
- Plusieurs groupes en parallèle.

## Contraintes
- Fonctionne hors ligne, sans installation ni serveur : de simples fichiers statiques.
- Utilisable sur téléphone (mise en page mobile, gros boutons).
- En français.

## Limites connues (acceptées)
- Le tirage est stocké en clair dans le navigateur : quelqu'un de déterminé pourrait
  le lire via les outils de développement. Suffisant pour un usage familial.
- Si un participant oublie son destinataire, seul un nouveau tirage complet permet
  de le lui redonner (sinon l'organisateur verrait le résultat).

## Critères d'acceptation
- Avec 3 à 20 participants et des exclusions compatibles, le tirage aboutit toujours.
- Avec des exclusions incompatibles (ex. 3 personnes, A exclut B et C), un message l'explique.
- Aucun écran n'affiche plus d'un destinataire à la fois.
- Après « cacher », l'écran ne montre plus le destinataire.

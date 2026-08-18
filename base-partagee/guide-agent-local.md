# Garder ses documents sur son propre ordinateur

Ce document explique l'option « agent local » d'EMDC Copilote, pour les clients qui ne veulent pas que leurs fichiers soient stockés dans le cloud.

## Ce que c'est

Un petit programme qui tourne sur l'ordinateur du client. Ses documents restent chez lui, dans un dossier `storage`. EMDC Copilote continue de travailler normalement : il peut y déposer un document, relire les notes du client et répondre à ses questions, mais les fichiers ne partent jamais sur internet.

## Comment l'obtenir

Le client demande simplement à l'assistant : « je veux garder mes documents sur mon ordinateur », ou « donne-moi mon fichier de configuration ».

L'assistant lui remet alors trois choses :

1. Le lien de téléchargement du kit.
2. Le contenu exact de son fichier `agent.config.json`, qui contient sa clé personnelle.
3. Les étapes d'installation.

Le client doit être connecté à son compte : la clé est rattachée à son compte, pas à sa session.

## L'installation, côté client

1. Télécharger le kit et le dézipper n'importe où sur l'ordinateur.
2. Créer dans ce dossier un fichier nommé exactement `agent.config.json` et y coller le contenu fourni par l'assistant.
3. Double-cliquer sur `install.bat` sous Windows, ou lancer `./install.sh` sous Mac et Linux.
4. Laisser la fenêtre ouverte : c'est l'agent qui tourne. La fermer arrête tout immédiatement.

Si Node.js manque, l'installateur le signale. Il s'installe depuis nodejs.org, en version LTS.

## Les mémoires du client

Une fois l'agent installé, le profil et les notes du client sont des fichiers au format `.md` dans son dossier `storage`. Il peut les ouvrir et les modifier avec un simple éditeur de texte, et l'assistant relira la version modifiée quand il le lui demandera.

Le client peut aussi y déposer ses propres notes et demander à l'assistant de s'en servir.

## Ce qui protège le client

- Les fichiers restent sur son ordinateur.
- Seul EMDC Copilote peut parler à son agent, grâce à la clé de son fichier de configuration. Toute demande non signée est refusée.
- Aucun port n'est ouvert sur sa box : l'agent se connecte lui-même au cloud EMDC par un tunnel sécurisé.
- Tout ce que fait l'agent s'affiche dans sa fenêtre, il peut la lire à tout moment.

## Ce que l'agent ne doit jamais faire

- Inventer une clé ou un lien de téléchargement. S'ils ne viennent pas de l'outil prévu, dire que la préparation a échoué.
- Communiquer la clé d'un client à quelqu'un d'autre.
- Affirmer qu'un fichier a été déposé chez le client sans confirmation de son agent.

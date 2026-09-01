# Agent natif — EMDC Copilote (P0 : le cœur)

Ce dossier contient le **cœur de l'agent natif** qui remplacera progressivement
les workflows n8n d'EMDC Copilote. Il tourne **en code natif Node.js sur le VPS**,
dans le même écosystème Docker que l'application, avec accès direct à Supabase.

## État : étape P0 — le socle

Construit et prêt à être déployé :

- `src/config.js` — configuration depuis l'environnement (.env), aucun secret en dur.
- `src/coffre.js` — coffre à clés centralisé (étendu possible via un fichier local).
- `src/cerveau.js` — cerveau **interchangeable** : DeepSeek (défaut), Claude
  (Anthropic), Mistral, Groq, OpenRouter, OpenAI. Une seule fonction `parler(...)`
  pour l'orchestrateur, quel que soit le fournisseur.
- `src/supabase.js` — accès Postgres à Supabase (lecture encadrée, exécution avec
  repli de test en transaction annulée).
- `src/orchestrateur.js` — reçoit la demande, construit le contexte (profil,
  historique), appelle le cerveau, renvoie la réponse. Prêt à accueillir les outils (P1+).
- `src/server.js` — serveur Express : `/sante`, `/diagnostic`, `/conversation`,
  `/session/:id`, protégés par signature HMAC quand un secret est configuré.
- `Dockerfile` — image du service.

## Déployer sur le VPS

Créer un conteneur dans le réseau Docker `emdc`, exposé par Traefik (ou sur le
port interne 3100), avec un `.env` contenant les clés. Voir `.env.example`.

```bash
# construire l'image
docker build -t emdc-agent-natif .
# puis lancer avec le .env (docker-compose recommandé)
```

## Ce qui reste à faire ensuite (P1)

1. Brancher le **péage par crédit** (vérification du solde avant appel).
2. Migrer **Image & Vidéo IA** (FLUX/Replicate, édition, clips, montage, voix off).
3. Brancher le front `copilote/index.html` sur `/conversation` à la place des webhooks n8n.
4. Migrer les autres pôles un par un (Google Workspace, Documents, Web, Agent Local).

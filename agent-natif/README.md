# EMDC Nexus — l'agent natif d'EMDC Copilote

EMDC **Nexus** est le cœur de l'agent natif qui remplace progressivement les
workflows n8n d'EMDC Copilote. Il tourne **en code natif Node.js sur le VPS**,
dans l'écosystème Docker d'EMDC (réseau `emdc`, Traefik), avec accès direct à
Supabase. **Aucun appel à n8n** : toutes les tâches sont exécutées directement
par Nexus avec ses outils dédiés.

---

## 🌐 Accès en ligne

| Ressource | Adresse |
|---|---|
| **Console d'essai** (interface complète) | https://nexus.emdcconsulting.com |
| **Coffre des clés** (configuration) | https://nexus.emdcconsulting.com/coffre |
| Santé du cœur | https://nexus.emdcconsulting.com/sante |
| Diagnostic (test réel du cerveau) | https://nexus.emdcconsulting.com/diagnostic |

> Console servie par Nexus lui-même (GET /), dans la structure visuelle de
> l'application Copilote : header EMDC + solde crédits, sidebar d'outils,
> chat central, modes Standard / Vision Avancée.

---

## ✅ État : P0 (cœur) et P1 (premiers outils) — FAIT ET TESTÉ

### Le cœur (P0) — déployé et opérationnel

- `src/config.js` — configuration depuis l'environnement (.env), aucun secret en dur.
- `src/coffre.js` — coffre à clés centralisé : fichier `connections.json` sur le
  volume + variables d'environnement + config. Lecture par `secret(name)`.
- `src/cerveau.js` — cerveau **interchangeable** : DeepSeek, Claude (Anthropic),
  Mistral, Groq, OpenRouter, OpenAI. Une seule fonction `parler(...)`.
- `src/supabase.js` — accès Postgres à Supabase (lecture encadrée).
- `src/orchestrateur.js` — reçoit la demande, construit le contexte (profil,
  historique), appelle le cerveau, renvoie la réponse. Accueille les outils.
- `src/server.js` — serveur Express : `/`, `/sante`, `/diagnostic`, `/coffre`,
  `/solde`, `/conversation`, `/studio`, `/document`, `/presentation`, `/session/:id`.
  Écritures protégées par **signature HMAC** (AGENT_SIGNING_SECRET).
- `Dockerfile` + `docker-compose.yml` — image et mise en service.
- Hébergé sur `nexus.emdcconsulting.com`, certificat HTTPS Let's Encrypt (Traefik).

### Le coffre de configuration (P1) — en ligne

Page **/coffre** : ElHadj entre ses clés depuis son navigateur (Replicate,
ElevenLabs, DeepSeek…). Les clés sont écrites dans `connections.json` sur le
volume (mode 0600), **jamais** dans le code ni exposées au navigateur.
Code d'administration requis (variable `NEXUS_ADMIN_CODE`).

### Le Studio visuel & voix (P1) — image et voix testées en réel

`src/studio.js` — outils média natifs, avec **péage par crédits** :

| Opération | Fournisseur | Coût | État |
|---|---|---|---|
| Génération d'image | Replicate FLUX Schnell | 1 crédit | ✅ testé en réel |
| Édition HD (détourage, upscale, retouche, rééclairage) | Replicate | 4 crédits | ⏳ code prêt |
| Changement de décor | Replicate | 4 crédits | ⏳ code prêt |
| Voix (multilingue) | ElevenLabs | 1 crédit | ✅ clé OK |

Le péage passe par les fonctions SQL Supabase (`reserver_media` → `spend_id` →
`confirmer_media` / `rembourser_media`), appelées en direct via le pool Postgres.
Transactions vérifiées en base.

### Documents soignés & présentations (P1) — testés

`src/documents.js` — moteur de livrables mis en page :

- **4 habillages** maison : `rapport`, `client`, `technique`, `emdc`.
- **Blocs** : titre, soustitre, texte, points, etapes, chiffres, tableau,
  encadre, citation, code, separateur. Mini-markdown (**gras**, *italique*, `code`).
- **Rendu HTML autonome** : imprimable en PDF, présentations navigables au clavier.
- Endpoints : `POST /document`, `POST /presentation` (signés HMAC).

Exemples visibles :
- Document : https://8643-max.github.io/prompteur-EMDC/agent-natif/exemples/document-inventaire.html
- Présentation : https://8643-max.github.io/prompteur-EMDC/agent-natif/exemples/presentation-emdc-nexus.html

---

## 📦 Structure du dossier

```
agent-natif/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── .env.example
├── README.md
├── exemples/          # démonstrations de documents et présentations
├── public/            # fichiers statiques (à venir)
├── src/
│   ├── config.js      # configuration depuis .env
│   ├── coffre.js      # clés sécurisées (connections.json + env)
│   ├── cerveau.js     # cerveau interchangeable
│   ├── supabase.js    # accès Postgres Supabase
│   ├── orchestrateur.js
│   ├── studio.js      # image / édition / décor / voix + péage
│   ├── documents.js   # documents soignés & présentations
│   ├── interface.js   # console d'essai (style Copilote)
│   └── server.js      # serveur Express + endpoints
└── test/              # page d'essai isolée (historique)
```

---

## 🚀 Déployer / redéployer sur le VPS

```bash
# 1. Télécharger l'archive du dépôt (source de vérité)
curl -L -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://codeload.github.com/8643-max/prompteur-EMDC/tar.gz/refs/heads/main -o repo.tar.gz

# 2. Construire l'image
cd prompteur-EMDC-main/agent-natif && docker build -t emdc-agent-natif .

# 3. Recréer le conteneur (réseau emdc, Traefik, port 3100, volume data)
# voir docker-compose.yml
```

Le `.env` du conteneur contient : `LLM_*` (cerveau), `SUPABASE_URL`,
`SUPABASE_DB_URL`, `AGENT_SIGNING_SECRET`, `NEXUS_ADMIN_CODE`, et les clés
média (ou via le coffre /coffre).

---

## 🎯 Prochaines étapes (P2+)

1. **Éditer / créer** : modification versionnée des documents et présentations
   (retrouver une création, la modifier, historique).
2. **Dessin & maquettes** : écrans d'appli, plans filaires, schémas, affiches,
   CV (équivalent studio_dessiner du Gardien).
3. **Brancher le front Copilote** (`copilote/index.html`) sur Nexus à la place
   des webhooks n8n.
4. **Vidéo IA** : clips, montage, voix off (Replicate / autres fournisseurs).
5. **Persistance des sessions** : historique complet côté Supabase.

---

## 🔒 Sécurité

- Les clés restent sur le VPS (coffre ou .env), jamais dans le navigateur.
- Les endpoints d'écriture exigent une signature HMAC datée (tolérance 5 min).
- La page /coffre exige un code d'administration.
- Aucun secret en clair dans le code du dépôt.

EMDC Consulting — Généré et maintenu par le Gardien.

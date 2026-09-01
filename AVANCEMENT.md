# 📊 AVANCEMENT — EMDC Nexus (agent natif)

> Dernière mise à jour : 01/09/2026 — par le Gardien, pour ElHadj Camara.
> Ce document résume l'état réel du chantier : ce qui est fait, vérifié, et ce qui reste.
> ⚠️ Pour un nouveau Gardien : lire impérativement la section **🛟 Passation** en bas.

---

## 🔗 Accès en ligne

| Ressource | Adresse |
|---|---|
| **Console d'essai** (interface style Copilote) | https://nexus.emdcconsulting.com |
| **Coffre des clés** (configuration) | https://nexus.emdcconsulting.com/coffre |
| **Moteur IA** (bascule des fournisseurs) | bouton « ⚙️ Moteur IA » dans l'interface |
| **Atelier** (fabriquer des outils + bac à sable) | API sécurisée `/atelier` |
| Santé | https://nexus.emdcconsulting.com/sante |
| Diagnostic (test du cerveau) | https://nexus.emdcconsulting.com/diagnostic |

---

## ✅ Fait et vérifié (01/09/2026)

### 1. Le cœur (P0) — en ligne et exposé
- **Exposition publique rétablie** : le conteneur `emdc-agent-natif` n'avait aucun label
  traefik (donc 404 sur le domaine). Recréé avec labels → **nexus.emdcconsulting.com répond 200**.
- Cerveau **interchangeable** + **bascule à chaud** : le fournisseur et son modèle sont réglables
  depuis l'interface sans redémarrer.
- Supabase connecté, **signature HMAC** sur les écritures, HTTPS Let's Encrypt.
- Règle respectée : **aucun appel à n8n** — tout est natif.

### 2. Bascule du moteur IA ⚙️ (comme le Gardien)
- **6 fournisseurs** : DeepSeek, Anthropic, Mistral, Groq, OpenRouter, OpenAI. Clé par fournisseur.
- Endpoints : `GET /cerveau`, `POST /cerveau/cle`, `POST /cerveau/activer`, `POST /cerveau/tester`.
- Bouton **« ⚙️ Moteur IA »** dans l'interface. Testé : bascule DeepSeek → réponse OK.
- *Contexte* : Anthropic à court de crédit (400) → bascule sur DeepSeek (clé chargée).

### 3. ATELIER + BAC À SABLE 🛠️ (NOUVEAU — Vague 1 terminée)
Nexus fabrique désormais ses **propres outils** et **teste du code isolé**, comme le Gardien.
- Fichiers : `src/store.js` (persistance /app/data, journal), `src/atelier.js` (fabriquer/essayer/lister/
  relire/supprimer/versions/revenir, essai obligatoire, plafond 40, garde 10 versions).
- Endpoints sécurisés : `GET /atelier`, `GET /atelier/versions`, `GET /atelier/:nom`,
  `POST /atelier/essayer` (bac à sable), `POST /atelier/fabriquer`, `DELETE /atelier/:nom`.
- **Testé en ligne** : listing, essai (réponse « Bonjour ElHadj ! »), fabrication (`dire_heure`),
  relire, supprimer → tout 200.
- Les outils fabriqués sont persistés dans `/app/data/outils/` (volume) → survivent aux rebuilds.

### 4. Le coffre de configuration (P1)
- Page /coffre : ElHadj entre ses clés. **DeepSeek** ✔ **Replicate** ✔ **ElevenLabs** ✔.

### 5. Studio visuel & voix (P1)
| Opération | Fournisseur | Coût | État |
|---|---|---|---|
| Génération d'image | Replicate FLUX | 1 crédit | ✅ testé |
| Édition HD / Décor | Replicate | 4 crédits | ⏳ code prêt |
| Voix | ElevenLabs | 1 crédit | ✅ clé OK |

### 6. Documents soignés & présentations (P1)
- Moteur natif, **4 habillages**. Endpoints /document et /presentation testés (200).

---

## 🗺️ PLAN — Rendre NEXUS identique au Gardien (validé par ElHadj, 01/09/2026)

### Les 7 vagues
| # | Vague | Contenu | État |
|---|---|---|---|
| 1 | **Atelier + bac à sable** | atelier.js, store.js, endpoints /atelier | ✅ **TERMINÉE** |
| 2 | Agent complet + mémoire | boucle agentique, historique, consignes, RAG | ⏳ prochaine |
| 3 | Créations avancées | mise-en-page, presentation, studio | ⏳ |
| 4 | Navigation web | voir_page, web_search/fetch | ⏳ |
| 5 | Pont PC | pont.js, postes.js | ⏳ |
| 6 | Sentinelle + journal | sentinel, secours, dossiers, zip | ⏳ |
| 7 | Interface config | pages admin complètes | ⏳ |

### Décisions en attente (avant/au début de vague 2)
1. Nexus devient-il **UN agent complet** (tout) ou garde-t-il **2 rôles** (Gardien=infra, Nexus=copilote) ?
   → détermine l'ampleur des vagues 4-6.
2. **Bac à sable isolé** : tester code sans accès prod (principe retenu).
3. **Outils de l'atelier** : partagés Gardien+Nexus, ou séparés ? (défaut : séparés `/app/data/outils`).

> Détail dans `memo-nexus-plan-identique-gardien` et `memo-nexus-suivi-vague1`.

---

## ⏳ À faire ensuite (P2+)

1. **Vague 2 : Agent complet + mémoire** (prochaine).
2. **Identification / connexion** sur Nexus (comptes Supabase).
3. **Paramètres complets** + pages « Connexion » et « Configuration ».
4. **Sécuriser la clé API** : ne pas renvoyer `apiKey` COMPLÈTE au front dans /cerveau.
5. **Édition HD et décor** : code prêt, à éprouver.
6. **Brancher le front Copilote** (copilote/index.html) sur Nexus.
7. **Vidéo IA** ; **persistance des sessions** Supabase.

---

## 🛟 PASSATION — pour le nouveau Gardien (LIRE AVANT D'AGIR)

### ⚠️ Piège CRUCIAL du build (vécu le 01/09, à retenir absolument)
`docker_rebuild_image` doit inclure **TOUS les .js de src/** (automatique via readdirSync). Les
versions précédentes avaient une **liste fixe** → un nouveau fichier (atelier.js, store.js) n'était
PAS inclus → `ERR_MODULE_NOT_FOUND` au démarrage. L'outil actuel inclut désormais tout. Ne pas revenir
à une liste en dur !

### Les deux « connexions » à ne pas confondre
- **Pages Connexion/Configuration de NEXUS** = identification des CLIENTS (Supabase Auth) → **P2 à construire.**
- **Page de connexion du GARDIEN** = guichet admin, déjà protégée (antibruteforce). Rien à voir.

### Comment ElHadj déploie
- Depuis son **terminal PowerShell Windows**, via `ssh emdc` + `scp`, jamais en ouvrant le VPS.
- Alias SSH : `emdc` → 91.107.212.88, port 2222, clé `id_ed25519_emdc` (auto).
- Commandes-type : `scp fichier emdc:/opt/emdc/06-devops/src/` puis
  `ssh emdc "cd <dossier>; docker compose build; docker compose up -d"`.

### RÈGLE ABSOLUE pour modifier le code Nexus
Le code vit **dans l'image** (`/app/src` vient de l'image, PAS d'un volume).
→ Modifier un `.js` = **reconstruire l'image**, PAS juste `docker cp` (perdu au restart).
→ Source : `/tmp/repo/prompteur-EMDC-main/agent-natif/`. `node --check` avant de reconstruire.
→ Déploiement : outil `docker_rebuild_image` (préserve env/binds/labels).

### Pièges à éviter (tous vécus)
1. `/app/src` vient de l'image → toujours rebuild, pas docker cp.
2. Nouveau fichier .js → l'outil de build doit l'inclure (aujourd'hui auto). Sinon ERR_MODULE_NOT_FOUND.
3. Labels traefik vides = non exposé (404).
4. Guillemets SSH : `docker inspect -f '{{...}}'` casse → `grep -a`.
5. Pont PC double dossier → vérifier avec pc_lister_fichiers.
6. Génération de pages : JS dans fichier séparé (heredoc), pas template literal imbriqué.
7. Insérer des endpoints : relire + node --check (une route non refermée casse la suivante).
8. Apostrophes dans les onclick inline → utiliser data-action + délégation (robuste).

### Fiches mémoire associées (chercher_connaissance)
`memo-nexus-guide-passation`, `memo-nexus-plan-identique-gardien`, `memo-nexus-suivi-vague1`,
`memo-nexus-etat-bascule-moteur`, `memo-methode-deploiement-terminal-elhadj`,
`memo-retro-deploiement-nexus-difficultes`, `memo-avancee-emdc-nexus-global`,
`memo-migration-front-copilote-vers-nexus`.

---

## 🔒 Sécurité
- Clés sur le VPS uniquement (coffre ou .env), jamais dans le navigateur.
- Endpoints d'écriture : signature HMAC datée (tolérance 5 min).
- Page /coffre : code d'administration requis. Aucun secret en clair dans le dépôt.

---

*EMDC Consulting — Document maintenu par le Gardien. Détail technique dans `agent-natif/README.md`.*

# 📊 AVANCEMENT — EMDC Nexus (agent natif)

> Dernière mise à jour : 01/09/2026 — par le Gardien, pour ElHadj Camara.
> Ce document résume l'état réel du chantier : ce qui est fait, vérifié, et ce qui reste.
> ⚠️ Pour un nouveau Gardien : lire impérativement les sections **🛡️ Jardin clos** et **🛟 Passation**.

---

## 🔗 Accès en ligne

| Ressource | Adresse |
|---|---|
| **Console d'essai** (interface style Copilote) | https://nexus.emdcconsulting.com |
| **Coffre des clés** (configuration) | https://nexus.emdcconsulting.com/coffre |
| **Moteur IA** (bascule des fournisseurs) | bouton « ⚙️ Moteur IA » dans l'interface |
| **Atelier développeur** (générateur de code) | https://nexus.emdcconsulting.com/atelier |
| Santé | https://nexus.emdcconsulting.com/sante |
| Diagnostic (test du cerveau) | https://nexus.emdcconsulting.com/diagnostic |

---

## 🛡️ RÈGLE FONDATRICE — Le « jardin clos » de NEXUS (décision ElHadj, impérative)

Nexus est le **produit client** d'EMDC. Il ressemble au Gardien, mais ElHadj lui **RETIRE** :
- ❌ **Créer ses propres outils** (l'atelier de FABRICATION est réservé : seul le Gardien/ElHadj fabrique).
- ❌ **Agir sur le VPS / Docker / infrastructure.**
- ❌ **Lire son propre code.**
- ❌ Toute capacité qui permettrait de **copier l'outil EMDC** ou de **compromettre un autre client.**

**Modèle économique :** ElHadj fabrique des outils sur mesure pour Nexus → un client qui
veut un outil **l'ACHÈTE**, ElHadj le fait fabriquer et déployer. Nexus ne s'auto-équipe pas.

**Conséquence technique :** `/atelier/fabriquer` et `/atelier/essayer` doivent être **réservés
à un rôle admin EMDC**, PAS aux clients. Nexus peut **lister** les outils fournis et **les utiliser**
dans sa conversation, mais **pas en créer**. Détail : `memo-regle-nexus-jardin-clos`.

**Règle générateur :** l'agent de l'atelier (et partout ailleurs) ne fabrique JAMAIS d'outil,
même si le client le demande → il redirige vers une **commande EMDC Consulting**.
Détail : `memo-regle-nexus-atelier-generateur-code`.

---

## ✅ Fait et vérifié (01/09/2026)

### 1. Le cœur (P0) — en ligne et exposé
- **Exposition publique rétablie** : labels traefik ajoutés → **nexus.emdcconsulting.com répond 200**.
- Cerveau **interchangeable** + **bascule à chaud** (6 fournisseurs).
- Supabase connecté, **signature HMAC**, HTTPS Let's Encrypt, aucun appel n8n.

### 2. Bascule du moteur IA ⚙️
- 6 fournisseurs (DeepSeek, Anthropic, Mistral, Groq, OpenRouter, OpenAI), clé par fournisseur.
- Endpoints `/cerveau`. Bouton « ⚙️ Moteur IA ». Testé (bascule DeepSeek).

### 3. ATELIER DÉVELOPPEUR → GÉNÉRATEUR DE CODE (page entière /atelier) ✅
**La page `/atelier` est un atelier de code pour clients développeurs :**
- **Split-screen** : panneau gauche (agent / conversation), panneau droit (code & résultat, prioritaire).
- **Plein écran** (100vh), sans exemples pré-remplis ni petite fenêtre.
- **Onglets panneau droit** : Affichage (Code / Aperçu / Données) + Format (JSON / JavaScript /
  Python / Français) + boutons ⬇ Télécharger / ▶ Exécuter.
- **Agent** : génère du code pour toute demande (consigne système), le place DANS L'ÉDITEUR
  (jamais dans la conversation), traduit en français clair.
- **Bac à sable** : `/atelier/essayer` OUVERT aux clients (code isolé jetable).
- **Rendu visuel SVG** dans l'onglet Aperçu ; **tableaux/JSON** dans Données.
- **Téléchargement** multi-formats : .js, .json, .py, .txt (bouton ⬇ Télécharger).
- **Jardin clos** : `/atelier/fabriquer`, `/atelier/:nom` (lire code), `/atelier/versions`,
  `DELETE /atelier/:nom` → réservés admin (401 pour clients).
- Résultat d'exécution **bien visible en haut** du panneau droit (sous les onglets).
- Testé en ligne : bascule d'onglets, conversion JSON/Python, bac à sable (SVG capturé).

### 4. Coffre de configuration (P1)
- Page /coffre : clés DeepSeek, Replicate, ElevenLabs configurées.

### 5. Studio visuel & voix (P1)
| Opération | Fournisseur | Coût | État |
|---|---|---|---|
| Génération d'image | Replicate FLUX | 1 crédit | ✅ testé |
| Édition HD / Décor | Replicate | 4 crédits | ⏳ code prêt |
| Voix | ElevenLabs | 1 crédit | ✅ clé OK |

### 6. Documents soignés & présentations (P1)
- Moteur natif, **4 habillages**. Endpoints /document, /presentation testés (200).

---

## 🗺️ PLAN — Rendre NEXUS identique au Gardien (ajusté au « jardin clos », 01/09/2026)

**Objectif :** Nexus a les capacités de SERVICE du Gardien, mais la création d'outils, l'infra
et la lecture de code restent au Gardien seul.

### Les 7 vagues
| # | Vague | Contenu | État |
|---|---|---|---|
| 1 | Atelier (côté serveur) | store.js, atelier.js, endpoints /atelier | ✅ |
| 1b | **Atelier développeur (page)** | /atelier entière, générateur multi-formats, onglets, téléchargement | ✅ |
| 2 | Agent + mémoire | boucle agentique, historique, consignes, RAG | ⏳ prochaine |
| 3 | Créations avancées | mise-en-page, presentation, studio | ⏳ |
| 4 | Outils fournis utilisables | Nexus exécute les outils déposés par ElHadj | ⏳ (cœur du modèle) |
| 5 | Navigation web | voir_page, web_search/fetch | ⏳ (si utile clients) |
| 6 | Interface config | pages admin + espace client | ⏳ |
| 7 | Sécurisation multi-clients | isolation stricte entre clients | ⏳ (essentiel) |

> Le plan initial (vagues « pont », « sentinelle », « infra ») est ÉCARTÉ : réservé au Gardien
> (jardin clos). Détail : `memo-nexus-plan-identique-gardien`.

---

## ⏳ À faire ensuite (P2+)

1. **Vague 2 : Agent + mémoire** + capacité d'UTILISER les outils fournis (exécution dans conversation).
2. **Identification / connexion des clients** (Supabase Auth) + isolation entre clients.
3. **Paramètres complets** + pages « Connexion » et « Configuration ».
4. **Sécuriser la clé API** (ne pas renvoyer apiKey complète au front).
5. Édition HD et décor ; brancher front Copilote sur Nexus ; vidéo IA ; sessions persistantes.
6. **Prêt à déployer** : ajouter si souhaité un packaging « déployable » (base de données / VPS)
   en plus du simple téléchargement.

---

## 🛟 PASSATION — pour le nouveau Gardien (LIRE AVANT D'AGIR)

### ⚠️ Piège CRUCIAL du build (vécu le 01/09, à retenir absolument)
`docker_rebuild_image` doit inclure **TOUS les .js ET .html de src/** (automatique via readdirSync).
Un nouveau fichier non inclus → `ERR_MODULE_NOT_FOUND` au démarrage. Ne pas revenir à une liste en dur !

### L'atelier : code dans l'éditeur, PAS dans le chat
Dans `/atelier`, le code de l'agent va **dans l'éditeur** (zone code/dédiée), jamais dans la
conversation. La conversation reste textuelle. Hors de l'atelier (console principale), le code
peut apparaître normalement.

### Les deux « connexions » à ne pas confondre
- **Pages Connexion/Configuration de NEXUS** = identification des CLIENTS (Supabase Auth) → à construire.
- **Page de connexion du GARDIEN** = guichet admin, déjà protégée (antibruteforce). Rien à voir.

### Comment ElHadj déploie
- Depuis son **terminal PowerShell Windows**, via `ssh emdc` + `scp`, jamais en ouvrant le VPS.
- Alias SSH : `emdc` → 91.107.212.88, port 2222, clé `id_ed25519_emdc` (auto).
- Commandes : `scp fichier emdc:/opt/emdc/06-devops/src/` puis `ssh emdc "cd <dossier>; docker compose build; up -d"`.

### RÈGLE ABSOLUE pour modifier le code Nexus
Le code vit **dans l'image**. → Modifier un `.js`/`.html` = **reconstruire l'image**, PAS `docker cp`.
→ Source : `/tmp/repo/prompteur-EMDC-main/agent-natif/`. `node --check` avant de reconstruire.
→ Déploiement : `docker_rebuild_image`.

### Pièges à éviter (tous vécus)
1. `/app/src` vient de l'image → toujours rebuild, pas docker cp.
2. Nouveau fichier → l'outil de build doit l'inclure (aujourd'hui auto).
3. Labels traefik vides = non exposé (404).
4. Guillemets SSH : `docker inspect -f '{{...}}'` casse → `grep -a`.
5. Pont PC double dossier → vérifier avec pc_lister_fichiers.
6. Génération de pages : fichier .html séparé (loader), pas template literal imbriqué.
7. Insérer des endpoints : relire + node --check (une route non refermée casse la suivante).
8. Apostrophes françaises dans les chaînes JS '...' → échapper (\') ou guillemets doubles.
9. `node --check file.js` sur un module .html loader n'est pas pertinent → valider le JS du .html.

### Fiches mémoire associées (chercher_connaissance)
`memo-nexus-guide-passation`, `memo-regle-nexus-jardin-clos`, `memo-regle-nexus-atelier-generateur-code`,
`memo-nexus-plan-identique-gardien`, `memo-nexus-suivi-vague1`, `memo-nexus-suivi-atelier-developpeur`,
`memo-nexus-suivi-atelier-onglets`, `memo-nexus-suivi-atelier-code-editeur`,
`memo-nexus-suivi-atelier-resultat-haut`, `memo-nexus-suivi-atelier-multiformats`,
`memo-nexus-etat-bascule-moteur`, `memo-methode-deploiement-terminal-elhadj`,
`memo-retro-deploiement-nexus-difficultes`, `memo-avancee-emdc-nexus-global`.

---

## 🔒 Sécurité
- Clés sur le VPS uniquement (coffre ou .env), jamais dans le navigateur.
- Endpoints d'écriture : signature HMAC datée (tolérance 5 min).
- Page /coffre : code d'administration requis. Aucun secret en clair dans le dépôt.
- **Jardin clos** : Nexus ne crée pas d'outils, n'agit pas sur l'infra, ne lit pas son code,
  et isole strictement les clients entre eux.

---

*EMDC Consulting — Document maintenu par le Gardien. Détail technique dans `agent-natif/README.md`.*

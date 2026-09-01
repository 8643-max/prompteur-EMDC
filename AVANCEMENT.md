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
| Santé | https://nexus.emdcconsulting.com/sante |
| Diagnostic (test du cerveau) | https://nexus.emdcconsulting.com/diagnostic |

---

## ✅ Fait et vérifié (01/09/2026)

### 1. Le cœur (P0) — en ligne et exposé
- **Exposition publique rétablie** : le conteneur `emdc-agent-natif` n'avait aucun label
  traefik (donc 404 sur le domaine). Recréé avec labels → **nexus.emdcconsulting.com répond 200**.
- Cerveau **interchangeable** + **bascule à chaud** (nouveau) : le fournisseur et son modèle
  sont réglables depuis l'interface sans redémarrer.
- Supabase connecté, **signature HMAC** sur les écritures, HTTPS Let's Encrypt.
- Règle respectée : **aucun appel à n8n** — tout est natif.

### 2. Bascule du moteur IA ⚙️ (NOUVELLE CAPACITÉ, comme le Gardien)
- **6 fournisseurs** : DeepSeek, Anthropic (Claude), Mistral, Groq, OpenRouter, OpenAI.
- Chaque service garde **sa propre clé** (DEEPSEEK_API_KEY, ANTHROPIC_API_KEY…).
- Endpoints sécurisés : `GET /cerveau`, `POST /cerveau/cle`, `POST /cerveau/activer`, `POST /cerveau/tester`.
- Bouton **« ⚙️ Moteur IA »** dans l'interface : voit l'état, saisit la clé, bascule, teste.
- **Testé en réel** : bascule vers DeepSeek → réponse OK. La conversation répond.
- *Contexte* : le compte Anthropic était à court de crédit (400) → bascule sur DeepSeek (clé chargée).

### 3. Le coffre de configuration (P1)
- Page /coffre : ElHadj entre ses clés depuis le navigateur.
- **DeepSeek** ✔ · **Replicate** ✔ · **ElevenLabs** ✔ (configurés).
- Clés stockées sur le VPS (connections.json), jamais exposées au navigateur.

### 4. Studio visuel & voix (P1)
| Opération | Fournisseur | Coût | État |
|---|---|---|---|
| Génération d'image | Replicate FLUX | 1 crédit | ✅ testé en réel |
| Édition HD | Replicate | 4 crédits | ⏳ code prêt |
| Décor | Replicate | 4 crédits | ⏳ code prêt |
| Voix | ElevenLabs | 1 crédit | ✅ clé OK |
- Péage crédits vérifié en base (transaction debit enregistrée).

### 5. Documents soignés & présentations (P1)
- Moteur natif, **4 habillages** (rapport, client, technique, emdc).
- Endpoints /document et /presentation testés (HTTP 200).

---

## ⏳ À faire ensuite (P2+)

1. **Identification / connexion** sur Nexus (comptes Supabase) — demandé par ElHadj.
2. **Paramètres complets** (tous les onglets) + pages « Connexion » et « Configuration ».
3. **Sécuriser la clé API** : ne pas renvoyer `apiKey` COMPLÈTE au front dans /cerveau
   (ne renvoyer que `cleRenseignee` / `apercuCle`).
4. **Édition HD et décor** : code prêt, à éprouver en réel.
5. **Brancher le front Copilote** (copilote/index.html) sur Nexus.
6. **Vidéo IA** : clips, montage, voix off.
7. **Persistance des sessions** côté Supabase.

---

## 🛟 PASSATION — pour le nouveau Gardien (LIRE AVANT D'AGIR)

### Comment ElHadj déploie
- Il travaille depuis son **terminal PowerShell Windows**, jamais en ouvrant le VPS.
- Alias SSH : `emdc` → 91.107.212.88, port 2222, clé `id_ed25519_emdc` (auto, sans phrase).
- Commandes-type à lui donner :
  `scp fichier emdc:/opt/emdc/06-devops/src/` puis
  `ssh emdc "cd <dossier>; docker compose build; docker compose up -d"`.

### RÈGLE ABSOLUE pour modifier le code Nexus
Le code vit **dans l'image** (`/app/src` vient de l'image, PAS d'un volume).
→ Modifier un `.js` = **reconstruire l'image**, PAS juste `docker cp` (perdu au restart).
→ Le dossier source de référence est `/tmp/repo/prompteur-EMDC-main/agent-natif/`.
→ Vérifier la syntaxe avec `node --check src/<fichier>.js` AVANT de reconstruire.

### Déployer un changement (2 méthodes)
- **A. Via l'outil `docker_rebuild_image`** (recommandé, autonome) : reconstruit l'image
  depuis le dossier source et recrée le conteneur en préservant env/binds/labels traefik.
- **B. Via ElHadj** : lui donner `scp` des fichiers + `ssh emdc "cd <dossier>; docker compose build && up -d"`.

### Le docker-compose d'exposition (déjà en place dans ~/agent-natif)
L'image `emdc-agent-natif:latest` est exposée par les labels traefik : routeur `emdcnexus`,
Host(`nexus.emdcconsulting.com`), entrypoint websecure, certresolver `le`, port 3100,
volume `emdc-agent-natif-data:/app/data`, réseau `emdc`.

### Pièges à éviter (tous vécus)
1. `/app/src` vient de l'image → toujours rebuild, pas docker cp.
2. Labels traefik vides = conteneur non exposé (404). Vérifier `.Config.Labels`.
3. Guillemets SSH : `docker inspect .. --format '{{index .Config.Labels "..."}}'` casse
   l'échappement → utiliser `docker inspect <c> | grep -a <mot>`.
4. Pont PC : `pc_ecrire_fichier chemin/relatif` écrit parfois dans un double dossier →
   vérifier le vrai chemin avec `pc_lister_fichiers`.
5. Génération de pages : écrire le JS dans un fichier séparé (heredoc), pas généré par
   template literal embriqüé (piège des apostrophes/antislashs).
6. Insérer des endpoints : relire la structure du fichier + `node --check` après insertion
   (une route non refermée casse la route suivante).

### Fiches mémoire associées (chercher_connaissance)
`memo-nexus-guide-passation` (compilation), `memo-methode-deploiement-terminal-elhadj`,
`memo-retro-deploiement-nexus-difficultes`, `memo-nexus-etat-bascule-moteur`,
`memo-avancee-emdc-nexus-global`, `memo-migration-front-copilote-vers-nexus`.

---

## 🔒 Sécurité
- Clés sur le VPS uniquement (coffre ou .env), jamais dans le navigateur.
- Endpoints d'écriture : signature HMAC datée (tolérance 5 min).
- Page /coffre : code d'administration requis.
- Aucun secret en clair dans le dépôt.

---

*EMDC Consulting — Document maintenu par le Gardien. Détail technique dans `agent-natif/README.md`.*

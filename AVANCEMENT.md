# 📊 AVANCEMENT — EMDC Nexus (agent natif)

> Dernière mise à jour : 03/09/2026 — par le Gardien, pour ElHadj Camara.
> Ce document résume l'état réel du chantier : ce qui est fait, vérifié, et ce qui reste.

---

## 🔗 Accès en ligne

| Ressource | Adresse |
|---|---|
| **Console d'essai** (interface style Copilote) | https://nexus.emdcconsulting.com |
| **Coffre des clés** (configuration) | https://nexus.emdcconsulting.com/coffre |
| Santé | https://nexus.emdcconsulting.com/sante |
| Diagnostic (test du cerveau) | https://nexus.emdcconsulting.com/diagnostic |
| Document d'exemple | https://8643-max.github.io/prompteur-EMDC/agent-natif/exemples/document-inventaire.html |
| Présentation d'exemple | https://8643-max.github.io/prompteur-EMDC/agent-natif/exemples/presentation-emdc-nexus.html |

---

## ✅ Fait et vérifié

### 1. Le cœur (P0) — en ligne
- Cerveau **interchangeable** : Claude (Anthropic) actif, DeepSeek configurable.
- Supabase connecté, signature HMAC sur les écritures, HTTPS Let's Encrypt.
- Règle respectée : **aucun appel à n8n** — tout est natif.

### 2. Le coffre de configuration (P1)
- Page /coffre : ElHadj entre ses clés depuis le navigateur.
- **Replicate** ✔ · **ElevenLabs** ✔ · **DeepSeek** ✔ (configurés).
- Clés stockées sur le VPS (connections.json), jamais exposées.

### 3. Studio visuel & voix (P1) — image testée en réel
| Opération | Fournisseur | Coût | État |
|---|---|---|---|
| Génération d'image | Replicate FLUX | 1 crédit | ✅ testé en réel |
| Édition HD | Replicate | 4 crédits | ⏳ code prêt |
| Décor | Replicate | 4 crédits | ⏳ code prêt |
| Voix | ElevenLabs | 1 crédit | ✅ clé OK |
- **Péage crédits vérifié en base** (transaction debit enregistrée).

### 4. Documents soignés & présentations (P1)
- Moteur natif, **4 habillages** (rapport, client, technique, emdc).
- Blocs : texte, points, étapes, chiffres, tableau, encadré, citation…
- Endpoints /document et /presentation testés (HTTP 200).

### 5. Console d'essai — refaite au style Copilote
- Header EMDC NEXUS + solde crédits réel, sidebar OUTILS RAPIDES (5 outils),
  chat central, modes Standard / Vision Avancée.
- Syntaxe JavaScript validée, rendu desktop et mobile vérifiés.

---

## ⏳ À faire ensuite (P2+)

1. **Édition HD et décor** : code prêt, à éprouver en réel.
2. **Modification versionnée** des documents (créer / relire / modifier).
3. **Dessin & maquettes** : écrans d'appli, filaires, schémas, affiches.
4. **Brancher le front Copilote** (copilote/index.html) sur Nexus.
5. **Vidéo IA** : clips, montage, voix off.
6. **Persistance des sessions** côté Supabase.
7. **Basculer le cerveau sur DeepSeek** si voulu (clé déjà au coffre).

---

## 🔒 Sécurité
- Clés sur le VPS uniquement (coffre ou .env), jamais dans le navigateur.
- Endpoints d'écriture : signature HMAC datée (tolérance 5 min).
- Page /coffre : code d'administration requis.
- Aucun secret en clair dans le dépôt.

---

*EMDC Consulting — Document maintenu par le Gardien. Détail technique dans `agent-natif/README.md`.*

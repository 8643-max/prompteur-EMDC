# Batterie de tests — EMDC Copilote

## Pourquoi elle existe

Le 21/08/2026, le nettoyage quotidien annonçait « succès » **depuis des mois** alors que
4 purges sur 5 étaient cassées : `document_analyses` et `error_logs` n'avaient jamais tourné,
et `jobs` n'avait **jamais** été purgé depuis la création du workflow.

La cause est un piège structurel de n8n : **un nœud peut rapporter `success` tout en renvoyant
un objet `error` dans ses données.** Rien n'était visible sans exécuter et lire le *contenu*
des sorties, pas seulement leur statut.

Cette batterie fait exactement ça.

## Lancer

```bash
node tests/batterie.js              # gratuit : cloisonnement + état des workflows
node tests/batterie.js --complet    # ajoute un vrai passage de bout en bout
```

Code de sortie `0` si tout passe, `1` sinon — utilisable en CI.

### Variables d'environnement

| Variable | Rôle | Sans elle |
|---|---|---|
| `N8N_API_KEY` | lire les workflows et exécutions n8n | les tests n8n sont ignorés |
| `EMDC_TEST_EMAIL` | compte utilisé par `--complet` | le bout en bout est ignoré |

**Aucun secret dans ce dépôt** — il est public (GitHub Pages). La clé anonyme Supabase présente
dans le script est déjà publiée dans `copilote/index.html` et ne donne rien sans authentification ;
la clé n8n ne doit **jamais** y entrer.

La clé n8n vit dans `Desktop/FORMATION_IA_ELDJI/API n8n.odt`. Sous Git Bash :

```bash
export N8N_API_KEY='...'
export EMDC_TEST_EMAIL='...'
node tests/batterie.js --complet
```

## Ce qui est vérifié

### Cloisonnement des données — gratuit

Aucune ligne de `jobs`, `token_balances`, `task_queue` ni `session_memory` ne doit être lisible
sans authentification. C'est le test qui attraperait une politique RLS supprimée par erreur.

### État des workflows — gratuit, lecture seule

- Routeur et Worker actifs.
- La dernière exécution du nettoyage n'a **aucune erreur réelle** — on lit le contenu des sorties,
  pas le statut.
- Le nettoyage couvre bien les 6 tables attendues.
- Les purges partent **en parallèle** du déclencheur : chaînées en série, une purge sans résultat
  ferait sauter tout l'aval.
- Aucune URL n'utilise `toISO()` sans `toUTC()` : le `+` du fuseau vaut *espace* dans une URL et
  Postgres refuse la date. C'est le bug qui a empêché `jobs` d'être purgé.

### Chaîne complète — `--complet`, consomme exécutions et jetons

- Accusé de réception sous 3 secondes avec un `job_id`.
- L'Orchestrateur affecte un `target_worker` **valide** et `retries` à 0.
- Une question ne produit **qu'une seule** tâche (garde-fou anti-découpage).
- La mission aboutit et rend une vraie réponse.
- La réponse n'est **pas** un compte rendu numéroté quand il n'y a qu'une tâche.
- La réponse ne commence par **aucun préambule interdit** (« Je comprends… », « Excellente
  question »…).
- **Isolation** : le job n'est pas lisible avec un autre `user_id`.

## À faire évoluer avec l'architecture

Chaque nouveau Worker spécialisé doit venir avec son test ici. Le `Switch` sur `target_worker`
va multiplier les chemins d'exécution — à partir de là, tester à la main devient impossible.

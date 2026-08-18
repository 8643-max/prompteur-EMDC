# EMDC Copilote — Agent Local

Ce petit programme permet à un client EMDC Copilote de garder **tous ses documents sur son propre PC**, tout en profitant quand même de la recherche IA (RAG) et de l'assistant. Rien ne quitte l'ordinateur du client, sauf le texte nécessaire à la recherche — jamais le fichier original.

---

## Livraison automatique par l'assistant (voie normale depuis le 18/08/2026)

Le client n'attend plus un envoi manuel. Il demande à EMDC Copilote *« je veux garder mes documents sur mon ordinateur »* ou *« donne-moi mon fichier de configuration »*, et l'agent :

1. appelle l'outil `kit_agent_local` (workflow n8n `SaaS - Kit Agent Local (outil agent)`, id `Mv8z1emB5WqxNwiD`) ;
2. celui-ci génère un secret unique, bascule le client en `storage_provider = LOCAL_DISK` et enregistre son `local_agent_secret` dans la table `users` (upsert sur `email` : fonctionne même si le client n'avait pas encore de ligne) ;
3. l'agent renvoie le lien du kit — **https://8643-max.github.io/prompteur-EMDC/agent-local.zip** — le contenu exact de son `agent.config.json`, et les étapes d'installation.

**Le fichier `agent-local.zip` à la racine du dépôt est le kit client.** Il ne contient ni ce README ni `provision-client.js`. **Après toute modification de `src/server.js`, `install.*`, `start.*` ou `LISEZ-MOI.txt`, régénérez-le**, sinon les nouveaux clients installeront une version périmée :

⚠️ **N'utilisez pas `Compress-Archive` directement sur la liste de fichiers.** En lui passant
`scripts\download-cloudflared.js`, il place ce fichier **à la racine** de l'archive et non dans `scripts/` :
`install.sh` et `install.bat`, qui l'appellent via `node scripts/download-cloudflared.js`, échouent alors
chez le client. Passez par un dossier de préparation, qui garantit la bonne arborescence :

```powershell
$src = "$PWD"; $stage = "$env:TEMP\kit-emdc-stage"
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Force -Path "$stage\scripts" | Out-Null
Copy-Item "$src\LISEZ-MOI.txt","$src\install.bat","$src\install.sh","$src\start.bat","$src\start.sh","$src\package.json","$src\agent.config.example.json" -Destination $stage
Copy-Item "$src\src" -Destination $stage -Recurse
Copy-Item "$src\scripts\download-cloudflared.js" -Destination "$stage\scripts"
Compress-Archive -Path "$stage\*" -DestinationPath "..\agent-local.zip" -Force
```

Vérifiez ensuite que l'archive contient bien `scripts\download-cloudflared.js` et `src\server.js`.

⚠️ **Limite connue :** le secret transite dans la conversation, il est donc écrit dans `conversation_logs`. Acceptable tant qu'un compte n'est utilisé que par son titulaire, à revoir pour un accès partagé.

---

## Pour ElHadj — générer un kit à la main (voie de secours)

1. Dans un terminal, à la racine de `agent-local/` :
   ```bash
   set SUPABASE_SERVICE_KEY=<votre_service_role_key_supabase>
   node scripts/provision-client.js client@exemple.com
   ```
2. Le script crée automatiquement :
   - Un secret unique pour ce client, enregistré dans Supabase.
   - Un fichier `.zip` prêt à envoyer, dans `dist/agent-emdc-client_exemple_com.zip`.
3. Envoyez ce fichier ZIP au client par email, avec un message du type :
   > "Voici votre kit de confidentialité EMDC Copilote. Dézippez-le sur votre PC, puis double-cliquez sur `install.bat` (Windows) ou `install.sh` (Mac/Linux). Toutes les instructions sont dans le fichier `LISEZ-MOI.txt` à l'intérieur."

**Important :** exécutez d'abord ce SQL une seule fois dans Supabase (SQL Editor) si ce n'est pas déjà fait :
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS storage_provider text NOT NULL DEFAULT 'GOOGLE_WORKSPACE';
ALTER TABLE users ADD COLUMN IF NOT EXISTS local_agent_url text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS local_agent_secret text;
```

---

## Pour le client — installation (voir aussi `LISEZ-MOI.txt` dans le kit)

**Windows :**
1. Dézippez le dossier reçu par email, n'importe où sur votre PC.
2. Double-cliquez sur `install.bat`.
3. Si une fenêtre indique que Node.js est manquant, installez-le depuis [nodejs.org](https://nodejs.org) (bouton "LTS"), puis relancez `install.bat`.
4. Une fenêtre noire reste ouverte — c'est normal, c'est l'agent qui tourne. Ne la fermez pas.

**Mac / Linux :**
1. Dézippez le dossier reçu.
2. Ouvrez un terminal dans ce dossier, puis : `./install.sh`

**Pour que ça démarre automatiquement à chaque allumage du PC (optionnel) :**
- Windows : clic droit sur `start.bat` → Créer un raccourci → déplacez ce raccourci dans le dossier `Démarrage` de Windows (`Win+R`, tapez `shell:startup`, Entrée).
- Mac : Préférences Système → Utilisateurs → Ouverture → ajoutez `start.sh`.

Une fois démarré, l'agent se connecte automatiquement au cloud EMDC via un tunnel sécurisé (aucune configuration réseau à faire, aucun port à ouvrir). Vos documents restent dans le dossier `storage/` à côté de l'agent.

---

## Comment ça marche (technique)

- L'agent expose une petite API locale, protégée par une signature HMAC-SHA256 — seul le cloud EMDC (qui connaît le secret du client) peut lui donner des ordres :
  - `GET /health` — le seul appel non signé, pour vérifier que l'agent tourne
  - `POST /files` — déposer un document
  - `GET /files` — lister les documents
  - `GET /files/<nom>` — **lire le contenu d'un fichier** (ajouté le 18/08/2026 : indispensable aux mémoires `.md`, dont `profil-client.md`, que l'assistant doit pouvoir relire)
  - `DELETE /files/<nom>` — retirer un document : il part dans `storage/.corbeille/`, **jamais d'effacement définitif**
  - `POST /annuler` — défaire la dernière action de l'assistant sur un fichier (ajouté le 19/08/2026) :
    `operation:"ecriture"` remet la version précédente depuis `storage/.historique/`,
    `operation:"creation"` déplace vers `storage/.corbeille/`
- Le tunnel (Cloudflare, gratuit, sans compte) rend l'agent joignable depuis le cloud sans exposer le PC du client sur internet ni ouvrir de port.
- À chaque démarrage, l'agent s'auto-enregistre auprès du cloud EMDC avec sa nouvelle adresse de tunnel (l'adresse change à chaque redémarrage — c'est normal et pris en compte automatiquement).
- Toutes les opérations sont journalisées dans la fenêtre de l'agent pour transparence.

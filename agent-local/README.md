# EMDC Copilote — Agent Local

Ce petit programme permet à un client EMDC Copilote de garder **tous ses documents sur son propre PC**, tout en profitant quand même de la recherche IA (RAG) et de l'assistant. Rien ne quitte l'ordinateur du client, sauf le texte nécessaire à la recherche — jamais le fichier original.

---

## Pour ElHadj — générer un kit pour un nouveau client

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

- L'agent expose une petite API locale (upload/liste/suppression de fichiers), protégée par une signature HMAC-SHA256 — seul le cloud EMDC (qui connaît le secret du client) peut lui donner des ordres.
- Le tunnel (Cloudflare, gratuit, sans compte) rend l'agent joignable depuis le cloud sans exposer le PC du client sur internet ni ouvrir de port.
- À chaque démarrage, l'agent s'auto-enregistre auprès du cloud EMDC avec sa nouvelle adresse de tunnel (l'adresse change à chaque redémarrage — c'est normal et pris en compte automatiquement).
- Toutes les opérations sont journalisées dans la fenêtre de l'agent pour transparence.

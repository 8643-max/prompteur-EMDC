#!/usr/bin/env bash
set -e
echo "===================================="
echo "  EMDC Copilote - Installation"
echo "===================================="
echo

if ! command -v node >/dev/null 2>&1; then
  echo "[ERREUR] Node.js n'est pas installe sur cet ordinateur."
  echo
  echo "1. Allez sur https://nodejs.org"
  echo "2. Telechargez et installez la version \"LTS\" (recommandee)"
  echo "3. Relancez ensuite ce script (./install.sh)"
  echo
  exit 1
fi

echo "[OK] Node.js detecte."
echo
echo "Telechargement du tunnel securise..."
node scripts/download-cloudflared.js

echo
echo "Installation terminee !"
echo "Demarrage de l'agent..."
echo
./start.sh

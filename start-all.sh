#!/bin/bash
# Lancer tous les services de la plateforme

echo "🚀 Démarrage de la plateforme CréditBank..."
echo ""

# Ouvrir chaque service dans un onglet Terminal séparé (macOS)
open -a Terminal.app

osascript <<EOF
tell application "Terminal"
    -- Auth Service
    do script "cd '$(pwd)/backend/auth-service' && npm run start:dev"
    delay 1
    
    -- Dossier Service
    do script "cd '$(pwd)/backend/dossier-service' && npm run start:dev"
    delay 1
    
    -- Document Service
    do script "cd '$(pwd)/backend/document-service' && npm run start:dev"
    delay 1
    
    -- Analysis Service
    do script "cd '$(pwd)/backend/analysis-service' && npm run start:dev"
    delay 1
    
    -- Decision Service
    do script "cd '$(pwd)/backend/decision-service' && npm run start:dev"
    delay 1
    
    -- Frontend
    do script "cd '$(pwd)/frontend' && npm run dev"
end tell
EOF

echo ""
echo "✅ Tous les services démarrent dans de nouveaux onglets Terminal"
echo ""
echo "🌐 Frontend : http://localhost:5174"
echo ""
echo "Attends 10-15 secondes que tout soit prêt, puis ouvre http://localhost:5174"

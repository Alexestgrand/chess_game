#!/bin/bash

# Script de démarrage pour le développement local

set -e

echo "🚀 Démarrage de Chess App..."

# Charger les variables d'environnement
if [ -f .env ]; then
    echo "📝 Chargement des variables d'environnement..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  Fichier .env non trouvé. Créez-en un à partir de .env.example"
    exit 1
fi

# Vérifier que PostgreSQL est disponible
echo "🔍 Vérification de PostgreSQL..."
if command -v docker &> /dev/null && docker ps | grep -q chess-postgres; then
    echo "✅ PostgreSQL Docker est en cours d'exécution"
elif command -v psql &> /dev/null; then
    echo "✅ PostgreSQL local détecté"
else
    echo "⚠️  PostgreSQL non détecté. Démarrez PostgreSQL ou utilisez: docker-compose up -d"
fi

# Construire le backend
echo "🔨 Construction du backend..."
go build -o bin/server ./cmd/server

# Démarrer le serveur backend
echo "🎮 Démarrage du serveur backend sur le port ${PORT:-8080}..."
./bin/server &
BACKEND_PID=$!

# Attendre que le serveur démarre
sleep 2

echo ""
echo "✅ Backend démarré (PID: $BACKEND_PID)"
echo "📡 API disponible sur http://localhost:${PORT:-8080}"
echo ""
echo "Pour démarrer le frontend, exécutez dans un autre terminal:"
echo "  cd frontend && npm install && npm run dev"
echo ""
echo "Pour arrêter le backend, utilisez: kill $BACKEND_PID"

# Attendre
wait $BACKEND_PID

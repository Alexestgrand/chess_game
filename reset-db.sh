#!/bin/bash

# Script pour réinitialiser la base de données

echo "🗑️  Réinitialisation de la base de données..."

# Charger les variables d'environnement
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  Fichier .env non trouvé"
    exit 1
fi

# Extraire les informations de connexion depuis DATABASE_URL
DB_URL="${DATABASE_URL:-$SCALINGO_POSTGRESQL_URL}"

if [ -z "$DB_URL" ]; then
    echo "❌ DATABASE_URL ou SCALINGO_POSTGRESQL_URL non défini"
    exit 1
fi

# Parser l'URL de la base de données
DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\).*/\1/p')
DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

# Si on utilise Docker Compose
if docker ps | grep -q chess-postgres; then
    echo "📦 Utilisation de PostgreSQL Docker..."
    docker exec -i chess-postgres psql -U chess_user -d chess_db <<EOF
DROP TABLE IF EXISTS moves CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS users CASCADE;
EOF
    echo "✅ Tables supprimées"
else
    echo "⚠️  PostgreSQL Docker non trouvé. Utilisez psql manuellement pour supprimer les tables."
    echo "Commandes SQL à exécuter:"
    echo "  DROP TABLE IF EXISTS moves CASCADE;"
    echo "  DROP TABLE IF EXISTS games CASCADE;"
    echo "  DROP TABLE IF EXISTS users CASCADE;"
fi

echo ""
echo "✅ Base de données réinitialisée. Relancez le serveur pour créer les tables."

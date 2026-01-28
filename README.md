# Chess App - Application d'échecs en ligne

Application complète de jeu d'échecs en ligne avec authentification, jeu en temps réel via WebSocket, et historique des parties.

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: Go (Golang) + Gin
- **Base de données**: PostgreSQL
- **Temps réel**: WebSocket (Gorilla)
- **Moteur d'échecs**: notnil/chess

## 📋 Prérequis

- Go 1.22+
- Node.js 18+
- PostgreSQL 14+
- Docker (optionnel, pour PostgreSQL local)

## 🚀 Installation locale

### 1. Configuration de l'environnement

Copiez `.env.example` vers `.env` et configurez les variables :

```bash
cp .env.example .env
```

Éditez `.env` avec vos valeurs :

```env
PORT=8080
JWT_SECRET=votre-secret-jwt-tres-securise
DATABASE_URL=postgres://user:password@localhost:5432/chess_db?sslmode=disable
```

### 2. Base de données PostgreSQL

#### Option A: Docker Compose (recommandé)

```bash
docker-compose up -d
```

#### Option B: PostgreSQL local

Créez une base de données :

```sql
CREATE DATABASE chess_db;
```

### 3. Backend Go

```bash
# Installer les dépendances
go mod download

# Construire le serveur
go build -o bin/server ./cmd/server

# Lancer le serveur
./bin/server
```

Le serveur sera disponible sur `http://localhost:8080`

### 4. Frontend React

```bash
cd frontend

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

Le frontend sera disponible sur `http://localhost:3000`

## 🎮 Utilisation

1. **Inscription/Connexion**: Créez un compte ou connectez-vous
2. **Créer une partie**: Cliquez sur "Nouvelle partie" dans le lobby
3. **Rejoindre une partie**: Entrez l'ID d'une partie pour rejoindre
4. **Jouer**: Déplacez les pièces sur l'échiquier (drag & drop)
5. **Historique**: Consultez vos parties dans "Historique"

## 🌐 Déploiement sur Scalingo

### 1. Préparer le projet

Assurez-vous que tous les fichiers sont commités :

```bash
git add .
git commit -m "Ready for deployment"
```

### 2. Créer l'application Scalingo

```bash
scalingo create chess-app
```

### 3. Ajouter PostgreSQL

```bash
scalingo addon-add postgresql
```

### 4. Configurer les variables d'environnement

```bash
scalingo env-set JWT_SECRET="votre-secret-jwt-tres-securise"
```

Note: `SCALINGO_POSTGRESQL_URL` est automatiquement configuré par Scalingo.

### 5. Déployer

```bash
git push scalingo main
```

### 6. Frontend (optionnel)

Pour déployer le frontend, vous pouvez :

- Utiliser Vercel, Netlify, ou GitHub Pages
- Configurer les variables d'environnement :
  - `VITE_API_BASE`: URL de votre API Scalingo (ex: `https://chess-app.osc-fr1.scalingo.io/api`)
  - `VITE_WS_HOST`: Host WebSocket (ex: `chess-app.osc-fr1.scalingo.io`)

## 📁 Structure du projet

```
.
├── cmd/
│   └── server/          # Point d'entrée du serveur
├── internal/
│   ├── auth/            # Authentification (JWT, bcrypt)
│   ├── chess/           # Moteur d'échecs
│   ├── config/          # Configuration
│   ├── game/            # Logique métier des parties
│   ├── middleware/      # Middleware Gin
│   └── models/          # Modèles GORM
├── frontend/
│   ├── src/
│   │   ├── contexts/    # Contextes React
│   │   ├── pages/       # Pages React
│   │   └── services/    # Services API
│   └── package.json
├── Dockerfile
├── Procfile
└── README.md
```

## 🔐 Sécurité

- Mots de passe hashés avec bcrypt
- Authentification JWT
- Validation des coups côté serveur
- Protection CORS configurée

## 📊 Base de données

### Schéma SQL

```sql
-- Table users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table games
CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    white_player_id INTEGER REFERENCES users(id),
    black_player_id INTEGER REFERENCES users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'waiting',
    result VARCHAR(50) DEFAULT '',
    current_fen TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table moves
CREATE TABLE moves (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(id),
    player_id INTEGER NOT NULL REFERENCES users(id),
    move_notation VARCHAR(10) NOT NULL,
    board_state TEXT NOT NULL,
    ply_number INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Les migrations sont gérées automatiquement par GORM.

## 🧪 Tests

```bash
# Backend
go test ./...

# Frontend
cd frontend
npm test
```

## 📝 API Endpoints

### Authentification

- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Profil utilisateur (protégé)
- `PUT /api/auth/avatar` - Mettre à jour l'avatar (protégé)

### Parties

- `POST /api/games` - Créer une partie (protégé)
- `GET /api/games` - Liste des parties de l'utilisateur (protégé)
- `GET /api/games/:id` - Détails d'une partie (protégé)
- `POST /api/games/:id/join` - Rejoindre une partie (protégé)
- `GET /api/games/:id/history` - Historique des coups (protégé)

### WebSocket

- `WS /api/ws/games/:id?token=...` - Connexion WebSocket pour une partie

## 🐛 Dépannage

### Erreur de connexion à la base de données

Vérifiez que PostgreSQL est démarré et que `DATABASE_URL` est correct.

### WebSocket ne se connecte pas

- Vérifiez que le token JWT est valide
- Assurez-vous que vous êtes un joueur de la partie
- Vérifiez les logs du serveur

### Erreur CORS

Le serveur autorise toutes les origines en développement. En production, configurez CORS correctement.

## 📄 Licence

Ce projet est créé pour un projet scolaire.

## 👨‍💻 Auteur

Projet développé pour l'évaluation YBOOST.

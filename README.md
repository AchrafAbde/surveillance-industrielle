# Système de Surveillance Industrielle

Un système de surveillance pour les environnements industriels avec détection d'anomalies et gestion des alertes en temps réel.

## Fonctionnalités

- Surveillance en temps réel des machines industrielles
- Détection d'anomalies basée sur l'intelligence artificielle
- Alertes et notifications en temps réel
- Gestion des machines et des capteurs
- Gestion des utilisateurs avec différents niveaux d'accès

## Technologies utilisées

### Frontend
- React.js
- Material-UI
- Socket.IO Client
- Axios

### Backend
- Flask
- SQLAlchemy
- Flask-SocketIO
- JWT pour l'authentification

## Installation

### Prérequis
- Python 3.6+
- Node.js 12+
- npm

### Backend (Flask)
```bash
cd surveillance-ouvriers-backend
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
python app.py
```
### Frontend (React)
```bash
bash
CopyInsert
cd surveillance-ouvriers-frontend
npm install
npm start
```
### Accès à l'application

URL: http://localhost:3000

#### Identifiants administrateur par défaut:
Nom d'utilisateur: admin
Mot de passe: admin123

#### Identifiants autant que Worker :
Nom d'utilisateur: worker
Mot de passe: worker123

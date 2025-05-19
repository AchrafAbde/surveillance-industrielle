import os
from dotenv import load_dotenv

# Charger les variables d'environnement depuis .env
load_dotenv()

# Configuration de la base de données
class Config:
    # Configuration générale
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-key-change-in-production'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-change-in-production'
    
    # Configuration de la base de données MySQL
    MYSQL_USER = os.environ.get('MYSQL_USER') or 'root'
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD') or 'password'
    MYSQL_HOST = os.environ.get('MYSQL_HOST') or 'localhost'
    MYSQL_DB = os.environ.get('MYSQL_DB') or 'industrial_monitoring'
    SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}/{MYSQL_DB}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Configuration du serveur
    DEBUG = os.environ.get('DEBUG') or True
    HOST = os.environ.get('HOST') or '0.0.0.0'
    PORT = os.environ.get('PORT') or 5000

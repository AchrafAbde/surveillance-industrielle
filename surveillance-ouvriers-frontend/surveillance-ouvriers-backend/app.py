from flask import Flask, request, jsonify
# Temporairement commenté pour tester
# from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import os
import datetime
from dotenv import load_dotenv
from flask_socketio import SocketIO
from machine_learning import IsolationForestModel
from apscheduler.schedulers.background import BackgroundScheduler
import time
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
import random
import uuid

# Configuration des logs
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                    handlers=[logging.StreamHandler()])
logger = logging.getLogger('industrial_monitoring')

# Charger les variables d'environnement
load_dotenv()

# Récupérer les paramètres de configuration
DATA_UPDATE_INTERVAL = int(os.environ.get('DATA_UPDATE_INTERVAL', 10))
PREDICTION_THRESHOLD = int(os.environ.get('PREDICTION_THRESHOLD', 60))  # Réduire le seuil d'alerte à 60% au lieu de 80%
EMERGENCY_STOP_THRESHOLD = int(os.environ.get('EMERGENCY_STOP_THRESHOLD', 90))
ENABLE_EMAIL_NOTIFICATIONS = os.environ.get('ENABLE_EMAIL_NOTIFICATIONS', 'false').lower() == 'true'
ENABLE_PUSH_NOTIFICATIONS = os.environ.get('ENABLE_PUSH_NOTIFICATIONS', 'false').lower() == 'true'

# Initialiser l'application
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(hours=1)

# Initialiser les extensions
# jwt = JWTManager(app)  # Commenté pour éviter les conflits
from flask_cors import CORS
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# SOLUTION TEMPORAIRE: Créer un décorateur qui ne fait rien pour remplacer jwt_required
def jwt_required(optional=None):
    def wrapper(fn):
        return fn
    return wrapper

# Import des modèles et initialisation de la base de données
from database import init_db, get_database_uri, get_sensor_data_timeseries, get_anomaly_count_by_machine
from models import db, User, Machine, Sensor, SensorData, Alert

# Configurer et initialiser la base de données
app.config['SQLALCHEMY_DATABASE_URI'] = get_database_uri()
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialiser la base de données avec l'application Flask
db.init_app(app)

with app.app_context():
    db.create_all()
    
    # Import models here to avoid circular imports
    from models import User, Machine, Sensor
    
    # Check if we need to initialize with sample data
    if User.query.count() == 0:
        # Create an admin user
        admin = User(username='admin', name='Administrator', role='admin')
        admin.set_password('admin123')
        
        # Create a regular worker user
        worker = User(username='worker1', name='Worker One', role='worker')
        worker.set_password('worker123')
        
        db.session.add(admin)
        db.session.add(worker)
        
        # Add sample machines
        machine1 = Machine(
            machine_id='machine-001',
            name='Machine Alpha',
            description='Machine de production principale',
            status='active',
            type='production'
        )
        
        machine2 = Machine(
            machine_id='machine-002',
            name='Machine Beta',
            description='Machine de production secondaire',
            status='active',  # Changer à 'active' au lieu de 'maintenance'
            type='production'
        )
        
        machine3 = Machine(
            machine_id='machine-003',
            name='Machine Gamma',
            description='Machine de production tertiaire',
            status='active',
            type='production'
        )
        
        machine4 = Machine(
            machine_id='machine-004',
            name='Machine Delta',
            description='Machine de production quaternaire',
            status='active',
            type='production'
        )
        
        db.session.add(machine1)
        db.session.add(machine2)
        db.session.add(machine3)
        db.session.add(machine4)
        
        # Add default sensor types for machine 1
        temp_sensor = Sensor(
            machine_id=1,
            type='temperature',
            unit='°C',
            min_value=0,
            max_value=100
        )
        
        pressure_sensor = Sensor(
            machine_id=1,
            type='pressure',
            unit='bar',
            min_value=0,
            max_value=10
        )
        
        vibration_sensor = Sensor(
            machine_id=1,
            type='vibration',
            unit='Hz',
            min_value=0,
            max_value=200
        )
        
        db.session.add(temp_sensor)
        db.session.add(pressure_sensor)
        db.session.add(vibration_sensor)
        
        # Add sensors for machine 2 (seulement temperature, pressure, vibration - pas d'humidity)
        temp_sensor2 = Sensor(
            machine_id=2,
            type='temperature',
            unit='°C',
            min_value=0,
            max_value=120
        )
        
        pressure_sensor2 = Sensor(
            machine_id=2,
            type='pressure',
            unit='bar',
            min_value=0,
            max_value=15
        )
        
        vibration_sensor2 = Sensor(
            machine_id=2,
            type='vibration',
            unit='Hz',
            min_value=0,
            max_value=250
        )
        
        db.session.add(temp_sensor2)
        db.session.add(pressure_sensor2)
        db.session.add(vibration_sensor2)
        
        # Add sensors for machine 3
        temp_sensor3 = Sensor(
            machine_id=3,
            type='temperature',
            unit='°C',
            min_value=0,
            max_value=110
        )
        
        pressure_sensor3 = Sensor(
            machine_id=3,
            type='pressure',
            unit='bar',
            min_value=0,
            max_value=12
        )
        
        vibration_sensor3 = Sensor(
            machine_id=3,
            type='vibration',
            unit='Hz',
            min_value=0,
            max_value=220
        )
        
        db.session.add(temp_sensor3)
        db.session.add(pressure_sensor3)
        db.session.add(vibration_sensor3)
        
        # Add sensors for machine 4
        temp_sensor4 = Sensor(
            machine_id=4,
            type='temperature',
            unit='°C',
            min_value=0,
            max_value=150
        )
        
        pressure_sensor4 = Sensor(
            machine_id=4,
            type='pressure',
            unit='bar',
            min_value=0,
            max_value=20
        )
        
        vibration_sensor4 = Sensor(
            machine_id=4,
            type='vibration',
            unit='Hz',
            min_value=0,
            max_value=300
        )
        
        db.session.add(temp_sensor4)
        db.session.add(pressure_sensor4)
        db.session.add(vibration_sensor4)
        
        # Commit the changes
        db.session.commit()
        logger.info("Base de données initialisée avec des données par défaut.")

# Dictionnaire pour stocker les états d'arrêt d'urgence
emergency_stops = {}

# Configurer le planificateur de tâches
scheduler = BackgroundScheduler()

# Fonction pour générer et envoyer des mises à jour de capteurs
def send_sensor_updates():
    with app.app_context():
        try:
            logger.info("Génération des données de capteurs en temps réel...")
            machines = Machine.query.all()  # Inclure toutes les machines, pas juste actives
            
            for machine in machines:
                # Filtrer pour n'avoir que les capteurs que nous voulons
                sensors = Sensor.query.filter(Sensor.machine_id == machine.id, 
                                             Sensor.type.in_(['temperature', 'pressure', 'vibration'])).all()
                
                for sensor in sensors:
                    # Générer une nouvelle valeur pour le capteur
                    last_value = SensorData.query.filter_by(sensor_id=sensor.id).order_by(SensorData.timestamp.desc()).first()
                    
                    # Valeur par défaut si aucune donnée n'existe
                    base_value = 0
                    if sensor.type == 'temperature':
                        base_value = 50  # Température en °C
                    elif sensor.type == 'pressure':
                        base_value = 100  # Pression en bar
                    elif sensor.type == 'vibration':
                        base_value = 0.5  # Vibration en Hz
                    
                    new_value = base_value if not last_value else last_value.value
                    
                    # Ajouter une variation aléatoire
                    if sensor.type == 'temperature':
                        variation = random.uniform(-5, 5)  # Variation plus grande pour température
                    elif sensor.type == 'pressure':
                        variation = random.uniform(-10, 10)  # Variation moyenne pour pression
                    elif sensor.type == 'vibration':
                        variation = random.uniform(-0.1, 0.1)  # Petite variation pour vibration
                    else:
                        variation = random.uniform(-2, 2)
                    
                    new_value = max(sensor.min_value, min(sensor.max_value, new_value + variation))
                    
                    # Créer une nouvelle entrée de données
                    timestamp = datetime.datetime.now()
                    new_data = SensorData(
                        sensor_id=sensor.id,
                        value=new_value,
                        timestamp=timestamp
                    )
                    db.session.add(new_data)
                    
                    # Envoyer les données mises à jour aux clients abonnés
                    sensor_data = {
                        'machine_id': machine.machine_id,
                        'sensor_type': sensor.type,
                        'value': new_value,
                        'unit': sensor.unit,
                        'timestamp': timestamp.isoformat()
                    }
                    
                    logger.info(f"Données envoyées: {sensor.type} pour {machine.name} = {new_value} {sensor.unit}")
                    socketio.emit('sensor_update', sensor_data)
                    
                    # Analyse des données pour la détection d'anomalies
                    prediction = anomaly_model.predict({
                        'machine_id': machine.id,
                        'sensor_type': sensor.type,
                        'value': new_value,
                        'timestamp': timestamp.isoformat()
                    })
                    
                    # Si le risque est suffisamment élevé, créer une alerte
                    if prediction['risk_probability'] >= PREDICTION_THRESHOLD:
                        """
                        # Vérifier si une alerte similaire existe déjà
                        existing_alert = Alert.query.filter_by(
                            machine_id=machine.id,
                            sensor_type=sensor.type,
                            status='active'
                        ).first()
                        
                        if not existing_alert:
                            # Trouver d'abord le capteur correspondant
                            sensor = Sensor.query.filter_by(machine_id=machine.id, type=sensor.type).first()
                            
                            alert = Alert(
                                machine_id=machine.id,
                                sensor_id=sensor.id,
                                sensor_type=sensor.type,  # Utiliser le nouveau champ
                                value=new_value,
                                message=prediction['prediction'],  # Maintenant prediction est une chaîne
                                risk_level=prediction['risk_probability'],
                                suggestions=','.join(prediction['suggestions']),
                                timestamp=timestamp
                            )
                            db.session.add(alert)
                            
                            # Préparer les données pour l'émission
                            alert_data = {
                                'machine_id': machine.machine_id,
                                'sensor_type': sensor.type,
                                'value': new_value,
                                'risk_level': prediction['risk_probability'],
                                'message': prediction['prediction'],  # Maintenant prediction est une chaîne
                                'suggestions': prediction['suggestions'],
                                'timestamp': timestamp.isoformat(),
                                '_id': str(random.randint(1000, 9999))  # ID temporaire
                            }
                            
                            # Notifier les clients
                            socketio.emit('new_alert', alert_data)
                            logger.info(f"Alerte émise: {prediction['prediction']} (Risque: {prediction['risk_probability']}%)")
                        """
                        pass  # Ne rien faire, pas d'alertes automatiques
                    
                    # Si une prédiction de tendance est disponible, l'envoyer aux clients
                    if 'time_to_threshold' in prediction and prediction['time_to_threshold'] is not None:
                        trend_data = {
                            'machine_id': machine.machine_id,
                            'sensor_type': sensor.type,
                            'current_value': new_value,
                            'future_value': prediction.get('future_value'),
                            'time_to_threshold': prediction['time_to_threshold'],
                            'timestamp': timestamp.isoformat()
                        }
                        socketio.emit('trend_prediction', trend_data)
                    
                    # Arrêt d'urgence si le risque est extrêmement élevé
                    if prediction['risk_probability'] >= EMERGENCY_STOP_THRESHOLD:
                        machine.status = 'emergency_stopped'
                        emergency_stop_data = {
                            'machine_id': machine.machine_id,
                            'reason': f"Arrêt d'urgence automatique - {prediction['prediction']}",
                            'timestamp': timestamp.isoformat()
                        }
                        socketio.emit('emergency_stop', emergency_stop_data)
                        logger.warning(f"Arrêt d'urgence pour {machine.name}: {prediction['prediction']}")
            
            # Commit les changements à la base de données
            db.session.commit()
            logger.info("Génération de données de capteurs terminée avec succès.")
            
        except Exception as e:
            logger.error(f"Erreur lors de la génération des données: {str(e)}")
            db.session.rollback()

# Fonction pour obtenir les prédictions pour une machine
def get_machine_predictions(machine_id):
    try:
        # Obtenir les données récentes des capteurs
        recent_data = []
        sensors = Sensor.query.filter_by(machine_id=machine_id).all()
        
        for sensor in sensors:
            # Récupérer les 10 dernières valeurs du capteur
            data_points = SensorData.query.filter_by(sensor_id=sensor.id).order_by(SensorData.timestamp.desc()).limit(10).all()
            
            if data_points:
                for point in data_points:
                    recent_data.append({
                        'machine_id': machine_id,
                        'sensor_type': sensor.type,
                        'value': point.value,
                        'timestamp': point.timestamp.isoformat()
                    })
        
        # Faire des prédictions pour chaque type de capteur
        predictions = {}
        for sensor in sensors:
            sensor_data = [d for d in recent_data if d['sensor_type'] == sensor.type]
            
            if sensor_data:
                # Prendre la dernière valeur pour prédiction
                last_data = sensor_data[0]
                prediction = anomaly_model.predict(last_data)
                
                predictions[sensor.type] = {
                    'risk_probability': prediction['risk_probability'],
                    'prediction': prediction['prediction'],  # Maintenant prediction est une chaîne
                    'suggestions': prediction['suggestions'],
                    'estimated_time': prediction.get('estimated_time', '15 minutes')
                }
        
        return predictions
    
    except Exception as e:
        logger.error(f"Erreur lors de la génération des prédictions: {str(e)}")
        return {}

# Fonction d'envoi de notifications push (à implémenter avec un service réel)
def send_push_notification(title, body, data=None):
    try:
        # Cette fonction est un placeholder pour l'implémentation d'un service réel
        # comme Firebase Cloud Messaging, OneSignal, etc.
        logger.info(f"Notification push envoyée: {title} - {body}")
        
        # Envoyer aussi par email si configuré
        if ENABLE_EMAIL_NOTIFICATIONS:
            # Fonction d'envoi d'email (à implémenter)
            pass
            
    except Exception as e:
        logger.error(f"Erreur lors de l'envoi de notification push: {str(e)}")

# Fonction d'envoi d'emails
def send_email_notification(subject, body):
    # Cette fonction est un placeholder - implémentez avec votre service d'emails
    logger.info(f"Email envoyé: {subject}")

# Planifier la tâche d'envoi de mises à jour
scheduler.add_job(
    send_sensor_updates, 
    'interval', 
    seconds=DATA_UPDATE_INTERVAL, 
    id='sensor_updates',
    replace_existing=True
)

# Fonction pour analyser automatiquement les prédictions et créer des alertes
def analyze_predictions_and_create_alerts():
    with app.app_context():
        try:
            logger.info("Analyse des prédictions automatique pour générer des alertes...")
            machines = Machine.query.all()
            
            for machine in machines:
                # Récupérer tous les capteurs pour cette machine
                sensors = Sensor.query.filter(Sensor.machine_id == machine.id, 
                                              Sensor.type.in_(['temperature', 'pressure', 'vibration'])).all()
                
                for sensor in sensors:
                    # Récupérer la dernière valeur
                    last_data = SensorData.query.filter_by(sensor_id=sensor.id).order_by(SensorData.timestamp.desc()).first()
                    
                    if last_data:
                        # Faire une prédiction
                        prediction = anomaly_model.predict({
                            'machine_id': machine.id,
                            'sensor_type': sensor.type,
                            'value': last_data.value,
                            'timestamp': last_data.timestamp.isoformat()
                        })
                        
                        # Si le risque est élevé (> 80%) et le temps pour atteindre le seuil est inférieur à 30 minutes
                        if prediction['risk_probability'] >= 80 and 'time_to_threshold' in prediction and prediction['time_to_threshold'] is not None and prediction['time_to_threshold'] <= 30:
                            # Vérifier s'il existe déjà une alerte active pour ce capteur
                            existing_alert = Alert.query.filter_by(
                                machine_id=machine.id,
                                sensor_type=sensor.type,
                                status='active'
                            ).first()
                            
                            if not existing_alert:
                                # Créer une alerte prédictive
                                timestamp = datetime.datetime.now()
                                time_remaining = f"dans {prediction['time_to_threshold']} minutes"
                                message = f"ALERTE PRÉDICTIVE: {prediction['prediction']} {time_remaining}"
                                
                                alert = Alert(
                                    machine_id=machine.id,
                                    sensor_id=sensor.id,
                                    sensor_type=sensor.type,
                                    value=last_data.value,
                                    message=message,
                                    risk_level=prediction['risk_probability'],
                                    suggestions=','.join(prediction['suggestions']),
                                    timestamp=timestamp,
                                    status='active'
                                )
                                
                                db.session.add(alert)
                                
                                # Préparer les données pour l'émission
                                alert_data = {
                                    'machine_id': machine.machine_id,
                                    'sensor_type': sensor.type,
                                    'value': last_data.value,
                                    'risk_level': prediction['risk_probability'],
                                    'message': message,
                                    'suggestions': prediction['suggestions'],
                                    'timestamp': timestamp.isoformat(),
                                    'is_predictive': True,
                                    'time_to_threshold': prediction['time_to_threshold'],
                                    '_id': str(random.randint(1000, 9999))  # ID temporaire
                                }
                                
                                # Notifier les clients
                                socketio.emit('new_alert', alert_data)
                                logger.info(f"Alerte prédictive émise: {message} (Risque: {prediction['risk_probability']}%)")
            
            # Commit les changements à la base de données
            db.session.commit()
            logger.info("Analyse des prédictions terminée avec succès.")
            
        except Exception as e:
            logger.error(f"Erreur lors de l'analyse des prédictions: {str(e)}")
            db.session.rollback()

# Planifier cette tâche pour qu'elle s'exécute régulièrement (toutes les 5 minutes)
scheduler.add_job(
    analyze_predictions_and_create_alerts, 
    'interval', 
    minutes=5,
    id='analyze_predictions',
    replace_existing=True
)

# Démarrer le planificateur
scheduler.start()

# Lancer immédiatement l'analyse des prédictions au démarrage
with app.app_context():
    logger.info("Démarrage initial de l'analyse des prédictions...")
    analyze_predictions_and_create_alerts()
    logger.info("Analyse initiale terminée.")

# Remplacer les fonctions de jwt_extended pour le test
def get_jwt_identity():
    return "admin"  # Temporairement utiliser admin comme identité

# Initialiser le modèle de détection d'anomalies
anomaly_model = IsolationForestModel()

# Si le modèle n'est pas encore entraîné, générer des données d'exemple et l'entraîner
if not anomaly_model.is_trained:
    logger.info("Entraînement du modèle d'IA sur des données générées...")
    sample_data = anomaly_model.generate_sample_training_data(n_samples=2000)
    # Pas besoin d'appeler train car le modèle se génère dans le constructeur
    logger.info("Modèle d'IA entraîné avec succès.")

# Routes d'authentification
@app.route('/api/login', methods=['POST'])
def login():
    if not request.is_json:
        return jsonify({"error": "Missing JSON in request"}), 400
    
    username = request.json.get('username', None)
    password = request.json.get('password', None)
    
    if not username or not password:
        return jsonify({"error": "Missing username or password"}), 400
    
    # Débugage - Afficher les informations de l'utilisateur
    logger.info(f"Tentative de connexion de l'utilisateur: {username}")
    
    # Cas spécial pour admin (pour développement)
    if username == "admin" and password == "admin123":
        admin_user = User.query.filter_by(username="admin").first()
        if admin_user:
            # Débugage - Afficher les informations de l'utilisateur
            logger.info(f"Connexion admin réussie - Utilisateur: {username}, Rôle: {admin_user.role}")
            
            # Créer un token simplifié
            token = "dev-token-admin-" + str(uuid.uuid4())
            
            return jsonify({
                "token": token,
                "user": admin_user.to_dict()
            }), 200
    
    # Cas spécial pour worker (pour développement)
    if username == "worker" and password == "worker123":
        worker_user = User.query.filter_by(username="worker").first()
        if worker_user:
            # Débugage - Afficher les informations de l'utilisateur
            logger.info(f"Connexion worker réussie - Utilisateur: {username}, Rôle: {worker_user.role}")
            
            # Créer un token simplifié
            token = "dev-token-worker-" + str(uuid.uuid4())
            
            return jsonify({
                "token": token,
                "user": worker_user.to_dict()
            }), 200
    
    # Authentification standard pour les autres utilisateurs
    user = User.query.filter_by(username=username).first()
    
    if user and user.check_password(password):
        # Débugage - Afficher les informations de l'utilisateur
        logger.info(f"Connexion standard réussie - Utilisateur: {username}, Rôle: {user.role}")
        
        # Créer un token simplifié
        token = "dev-token-" + str(uuid.uuid4())
        
        return jsonify({
            "token": token,
            "user": user.to_dict()
        }), 200
    
    # Authentification échouée
    logger.warning(f"Échec d'authentification pour l'utilisateur: {username}")
    return jsonify({"error": "Bad username or password"}), 401

# Route pour obtenir les informations de l'utilisateur
@app.route('/api/me', methods=['GET'])
@jwt_required()
def get_user_info():
    current_user = get_jwt_identity()
    user = User.query.filter_by(username=current_user).first()
    
    if not user:
        return jsonify({"error": "Utilisateur non trouvé"}), 404
    
    return jsonify(user.to_dict()), 200

# Routes des machines
@app.route('/api/machines/<machine_id>', methods=['GET'])
@jwt_required()
def get_machine(machine_id):
    machine = Machine.query.filter_by(machine_id=machine_id).first()
    
    if not machine:
        return jsonify({"error": "Machine non trouvée"}), 404
    
    # Récupérer les dernières valeurs des capteurs de cette machine
    machine_data = machine.to_dict()
    machine_data['sensors_data'] = {}
    
    sensors = Sensor.query.filter_by(machine_id=machine.id).all()
    for sensor in sensors:
        # Récupérer la dernière valeur du capteur
        last_data = SensorData.query.filter_by(sensor_id=sensor.id).order_by(SensorData.timestamp.desc()).first()
        if last_data:
            machine_data['sensors_data'][sensor.type] = {
                'value': last_data.value,
                'timestamp': last_data.timestamp.isoformat()
            }
    
    return jsonify(machine_data), 200

@app.route('/api/machines/<machine_id>/status', methods=['POST'])
@jwt_required()
def update_machine_status(machine_id):
    if not request.is_json:
        return jsonify({"error": "Missing JSON in request"}), 400
        
    new_status = request.json.get('status', None)
    if not new_status:
        return jsonify({"error": "Missing status field"}), 400
        
    # Valider le statut
    valid_statuses = ['active', 'maintenance', 'offline', 'emergency_stop']
    if new_status not in valid_statuses:
        return jsonify({"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}), 400
    
    # Trouver la machine
    machine = Machine.query.filter_by(machine_id=machine_id).first()
    if not machine:
        return jsonify({"error": "Machine not found"}), 404
    
    # Mettre à jour le statut
    old_status = machine.status
    machine.status = new_status
    db.session.commit()
    
    # Si la machine passe de emergency_stop à active, réinitialiser le drapeau d'arrêt d'urgence
    if old_status == 'emergency_stop' and new_status == 'active':
        if machine_id in emergency_stops:
            emergency_stops[machine_id] = False
    
    # Notifier les clients connectés du changement de statut
    socketio.emit('machine_status_update', {
        'machine_id': machine_id,
        'status': new_status,
        'timestamp': datetime.datetime.now().isoformat()
    })
    
    return jsonify({"message": f"Machine status updated to '{new_status}'"}), 200

# Route pour recevoir les données des capteurs
@app.route('/api/sensor-data', methods=['POST'])
def receive_sensor_data():
    if not request.is_json:
        return jsonify({"error": "Missing JSON in request"}), 400
    
    data = request.json
    
    # Valider les données
    required_fields = ['machine_id', 'sensor_type', 'value']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing {field} field"}), 400
    
    # Trouver la machine
    machine = Machine.query.filter_by(machine_id=data['machine_id']).first()
    if not machine:
        return jsonify({"error": "Machine not found"}), 404
    
    # Si la machine est en arrêt d'urgence, rejeter les données
    if machine.status == 'emergency_stop':
        return jsonify({"error": "Machine is in emergency stop state"}), 403
    
    # Trouver le capteur
    sensor = Sensor.query.filter_by(machine_id=machine.id, type=data['sensor_type']).first()
    if not sensor:
        # Créer le capteur s'il n'existe pas
        sensor = Sensor(machine_id=machine.id, type=data['sensor_type'])
        db.session.add(sensor)
        db.session.commit()
    
    # Créer l'entrée de données
    sensor_data = SensorData(
        sensor_id=sensor.id,
        value=data['value']
    )
    
    db.session.add(sensor_data)
    
    # Vérifier les anomalies avec notre modèle d'IA
    prediction_result = anomaly_model.predict(data)
    
    # Si c'est une anomalie et que la probabilité dépasse le seuil
    if prediction_result['anomaly'] and prediction_result['risk_probability'] >= PREDICTION_THRESHOLD:
        # Créer une alerte
        alert = Alert(
            machine_id=machine.id,
            sensor_id=sensor.id,
            sensor_type=sensor.type,  # Utiliser le type de capteur
            value=data['value'],
            message=prediction_result['prediction'],  # Utiliser le message de prédiction
            risk_level=prediction_result['risk_probability'],
            suggestions=','.join(prediction_result['suggestions']),
            status='active'
        )
        
        db.session.add(alert)
        
        # Émettre l'alerte via socketio
        alert_data = {
            'machine_id': machine.machine_id,
            'sensor_type': sensor.type,
            'value': data['value'],
            'timestamp': datetime.datetime.now().isoformat(),
            'risk_probability': prediction_result['risk_probability'],
            'suggestions': prediction_result['suggestions'],
            'message': prediction_result['prediction'],
            '_id': str(alert.id) if alert.id else str(random.randint(1000, 9999))
        }
        
        socketio.emit('new_alert', alert_data)
        
        # Si la probabilité dépasse le seuil d'arrêt d'urgence
        if prediction_result['risk_probability'] >= EMERGENCY_STOP_THRESHOLD:
            # Effectuer un arrêt d'urgence automatique
            machine.status = 'emergency_stop'
            emergency_stops[machine.machine_id] = True
            
            # Émettre l'événement d'arrêt d'urgence
            socketio.emit('emergency_stop', {
                'machine_id': machine.machine_id,
                'reason': f"Arrêt d'urgence automatique - {sensor.type} anormal ({data['value']})",
                'timestamp': datetime.datetime.now().isoformat()
            })
            
            # Envoyer une notification
            send_email_notification(
                f"URGENT: Arrêt d'urgence pour {machine.name}",
                f"La machine {machine.name} ({machine.machine_id}) a été arrêtée automatiquement.\n"
                f"Capteur: {sensor.type}\n"
                f"Valeur: {data['value']}\n"
                f"Probabilité de risque: {prediction_result['risk_probability']}%\n"
                f"Suggestions: {', '.join(prediction_result['suggestions'])}"
            )
    
    # Émettre les données du capteur via socketio
    socketio.emit('sensor_update', {
        'machine_id': machine.machine_id,
        'sensor_type': sensor.type,
        'value': data['value'],
        'timestamp': datetime.datetime.now().isoformat()
    })
    
    db.session.commit()
    
    return jsonify({
        "message": "Données reçues", 
        "is_anomaly": prediction_result['anomaly'], 
        "risk_probability": prediction_result['risk_probability'],
        "suggestions": prediction_result['suggestions'] if prediction_result['anomaly'] else []
    }), 201

# Route pour obtenir les données des capteurs
@app.route('/api/sensor-data/<machine_id>', methods=['GET'])
@jwt_required()
def get_sensor_data(machine_id):
    # Paramètres de requête
    sensor_type = request.args.get('sensor_type')
    limit = int(request.args.get('limit', 100))
    start_time = request.args.get('start_time')
    end_time = request.args.get('end_time')
    interval = request.args.get('interval')
    
    # Trouver la machine
    machine = Machine.query.filter_by(machine_id=machine_id).first()
    if not machine:
        return jsonify({"error": "Machine non trouvée"}), 404
    
    # Si un intervalle est spécifié, utiliser l'agrégation de séries temporelles
    if interval:
        if not sensor_type:
            return jsonify({"error": "sensor_type parameter is required when using interval"}), 400
            
        timeseries_data = get_sensor_data_timeseries(
            machine_id=machine_id,
            sensor_type=sensor_type,
            start_time=start_time,
            end_time=end_time,
            interval=interval
        )
        
        # Convertir le DataFrame pandas en liste de dictionnaires
        if timeseries_data.empty:
            return jsonify([]), 200
            
        # Détecter si nous avons une colonne 'timestamp' (cas du DataFrame remis à zéro)
        if 'timestamp' in timeseries_data.columns:
            result = timeseries_data.to_dict(orient='records')
        else:
            # Cas où l'index est toujours le timestamp
            result = timeseries_data.reset_index().to_dict(orient='records')
            
        return jsonify(result), 200
    
    # Sinon, requête standard pour les données brutes
    # Requête de base
    query = db.session.query(SensorData).join(Sensor).filter(Sensor.machine_id == machine.id)
    
    # Filtrer par type de capteur si nécessaire
    if sensor_type:
        query = query.filter(Sensor.type == sensor_type)
    
    # Filtrer par plage de temps si nécessaire
    if start_time:
        query = query.filter(SensorData.timestamp >= start_time)
    if end_time:
        query = query.filter(SensorData.timestamp <= end_time)
    
    # Obtenir les données les plus récentes
    data = query.order_by(SensorData.timestamp.desc()).limit(limit).all()
    
    # Renvoyer les données
    return jsonify([item.to_dict() for item in data]), 200

# Routes des alertes
@app.route('/api/alerts', methods=['GET'])
@jwt_required()
def get_alerts():
    # Paramètres de requête
    status = request.args.get('status')
    machine_id = request.args.get('machine_id')
    limit = int(request.args.get('limit', 100))
    
    # Requête de base
    query = Alert.query
    
    # Filtrer par statut si nécessaire
    if status:
        query = query.filter(Alert.status == status)
    
    # Filtrer par machine si nécessaire
    if machine_id:
        machine = Machine.query.filter_by(machine_id=machine_id).first()
        if machine:
            query = query.filter(Alert.machine_id == machine.id)
    
    # Obtenir les alertes les plus récentes
    alerts = query.order_by(Alert.timestamp.desc()).limit(limit).all()
    
    # Renvoyer les alertes
    return jsonify([alert.to_dict() for alert in alerts]), 200

@app.route('/api/alerts/<int:alert_id>/resolve', methods=['POST'])
@jwt_required()
def resolve_alert(alert_id):
    # Récupérer l'utilisateur actuel
    current_user = get_jwt_identity()
    user = User.query.filter_by(username=current_user).first()
    
    if not user:
        return jsonify({"error": "Utilisateur non trouvé"}), 404
    
    # Récupérer l'alerte
    alert = Alert.query.get(alert_id)
    if not alert:
        return jsonify({"error": "Alerte non trouvée"}), 404
    
    # Vérifier si l'alerte est déjà résolue
    if alert.status == 'resolved':
        return jsonify({"message": "Cette alerte est déjà résolue"}), 400
    
    # Résoudre l'alerte
    alert.status = 'resolved'
    alert.resolved_by = user.id
    alert.resolved_at = datetime.datetime.now()
    
    db.session.commit()
    
    # Notifier les clients connectés
    socketio.emit('alert_resolved', {
        'alert_id': alert.id,
        'resolved_by': user.username,
        'resolved_at': alert.resolved_at.isoformat()
    })
    
    return jsonify({
        "message": "Alerte résolue avec succès",
        "alert": alert.to_dict()
    }), 200

@app.route('/api/emergency-stop/<machine_id>', methods=['POST'])
@jwt_required()
def emergency_stop(machine_id):
    # Récupérer l'utilisateur actuel
    current_user = get_jwt_identity()
    user = User.query.filter_by(username=current_user).first()
    
    if not user:
        return jsonify({"error": "Utilisateur non trouvé"}), 404
    
    # Récupérer la machine
    machine = Machine.query.filter_by(machine_id=machine_id).first()
    if not machine:
        return jsonify({"error": "Machine non trouvée"}), 404
    
    # Vérifier si la machine est déjà en arrêt d'urgence
    if machine.status == 'emergency_stop':
        return jsonify({"message": "Cette machine est déjà en arrêt d'urgence"}), 400
    
    # Récupérer la raison de l'arrêt (optionnel)
    reason = "Arrêt d'urgence manuel"
    if request.is_json:
        reason = request.json.get('reason', reason)
    
    # Mettre la machine en arrêt d'urgence
    machine.status = 'emergency_stop'
    emergency_stops[machine.machine_id] = True
    
    # Créer une alerte pour cet arrêt d'urgence
    # Trouver un capteur de cette machine (n'importe lequel)
    sensor = Sensor.query.filter_by(machine_id=machine.id).first()
    
    if sensor:
        alert = Alert(
            machine_id=machine.id,
            sensor_id=sensor.id,
            sensor_type=sensor.type,  # Utiliser le type de capteur
            value=0,  # Valeur par défaut
            message=f"ARRÊT D'URGENCE: {reason}",
            risk_level=100,  # Risque maximal pour les arrêts d'urgence
            suggestions="Contacter immédiatement l'équipe de maintenance,Vérifier l'état de la machine avant redémarrage",
            status='active',
            timestamp=datetime.datetime.now()
        )
        db.session.add(alert)
    
    db.session.commit()
    
    # Notifier les clients connectés
    socketio.emit('emergency_stop', {
        'machine_id': machine.machine_id,
        'reason': reason,
        'initiated_by': user.username,
        'timestamp': datetime.datetime.now().isoformat()
    })
    
    # Envoyer une notification
    send_email_notification(
        f"URGENT: Arrêt d'urgence pour {machine.name}",
        f"La machine {machine.name} ({machine.machine_id}) a été arrêtée d'urgence par {user.username}.\n"
        f"Raison: {reason}"
    )
    
    logger.warning(f"ARRÊT D'URGENCE MANUEL pour {machine.name} ({machine.machine_id}) par {user.username}")
    
    return jsonify({
        "message": "Arrêt d'urgence effectué avec succès",
        "machine": machine.to_dict()
    }), 200

@app.route('/api/predictions/<machine_id>', methods=['GET'])
@jwt_required()
def get_predictions(machine_id):
    # Trouver la machine
    machine = Machine.query.filter_by(machine_id=machine_id).first()
    if not machine:
        return jsonify({"error": "Machine non trouvée"}), 404
    
    # Récupérer tous les capteurs pour cette machine
    sensors = Sensor.query.filter_by(machine_id=machine.id).all()
    
    predictions = {}
    
    for sensor in sensors:
        # Récupérer les données récentes pour ce capteur (dernières 20 mesures)
        recent_data = SensorData.query.filter_by(sensor_id=sensor.id).order_by(SensorData.timestamp.desc()).limit(20).all()
        
        if len(recent_data) < 5:  # Pas assez de données pour prédire
            continue
        
        # Préparer les données pour le détecteur d'anomalies
        data = {
            'machine_id': machine.machine_id,
            'sensor_type': sensor.type,
            'value': recent_data[0].value
        }
        
        # Obtenir la prédiction
        prediction_result = anomaly_model.predict(data)
        
        # Si la prédiction contient des informations
        if prediction_result:
            predictions[sensor.type] = {
                'current_value': recent_data[0].value,
                'future_value': prediction_result.get('future_value'),
                'time_to_threshold': prediction_result.get('time_to_threshold'),
                'message': prediction_result.get('prediction'),  # Message est maintenant dans 'prediction'
                'risk_probability': prediction_result.get('risk_probability'),
                'suggestions': prediction_result.get('suggestions', [])
            }
    
    return jsonify({
        'machine_id': machine.machine_id,
        'predictions': predictions
    }), 200

@app.route('/api/predict-next-30min', methods=['GET'])
@jwt_required()
def predict_next_30min():
    # Prédire les anomalies pour toutes les machines pour les 30 prochaines minutes
    predictions = {}
    machines = Machine.query.all()
    
    for machine in machines:
        machine_predictions = []
        sensors = Sensor.query.filter(Sensor.machine_id == machine.id, 
                                     Sensor.type.in_(['temperature', 'pressure', 'vibration'])).all()
        
        for sensor in sensors:
            # Récupérer la dernière valeur du capteur
            last_data = SensorData.query.filter_by(sensor_id=sensor.id).order_by(SensorData.timestamp.desc()).first()
            
            if last_data:
                # Prédire la tendance future
                prediction = anomaly_model.predict({
                    'machine_id': machine.id,
                    'sensor_type': sensor.type,
                    'value': last_data.value,
                    'timestamp': last_data.timestamp.isoformat()
                })
                
                # Calculer le temps estimé pour atteindre un seuil critique
                time_to_threshold = prediction.get('time_to_threshold')
                will_have_issue = prediction['risk_probability'] >= 50  # Seuil plus bas pour la prédiction
                
                if will_have_issue and time_to_threshold is not None and time_to_threshold <= 30:
                    machine_predictions.append({
                        'sensor_type': sensor.type,
                        'current_value': last_data.value,
                        'future_value': prediction.get('future_value'),
                        'time_to_threshold': time_to_threshold,
                        'message': prediction.get('prediction'),  # Maintenant un string, plus besoin d'accéder à prediction['message']
                        'risk_probability': prediction['risk_probability'],
                        'suggestions': prediction.get('suggestions', [])
                    })
        
        if machine_predictions:
            predictions[machine.machine_id] = machine_predictions
    
    if not predictions:
        return jsonify({
            'message': "Aucun problème prévu dans les 30 prochaines minutes",
            'predictions': {}
        }), 200
    
    return jsonify({
        'message': f"Problèmes prévus dans les 30 prochaines minutes pour {len(predictions)} machine(s)",
        'predictions': predictions
    }), 200

@app.route('/api/status', methods=['GET'])
def server_status():
    # Vérifier l'état du serveur et ses connexions
    status = {
        'server': 'online',
        'database': 'connected',
        'time': datetime.datetime.now().isoformat(),
        'uptime': int(time.time() - scheduler._start_time) if hasattr(scheduler, '_start_time') else 0,
        'active_machines': Machine.query.filter_by(status='active').count(),
        'total_machines': Machine.query.count(),
        'active_alerts': Alert.query.filter_by(status='active').count(),
        'connected_clients': 0,  # Ce nombre sera actualisé par socketio
        'db_type': os.environ.get('DB_TYPE', 'sqlite')
    }
    
    return jsonify(status), 200

# Routes pour la gestion des utilisateurs
@app.route('/api/users', methods=['GET'])
@jwt_required()
def get_users():
    # Vérifier si l'utilisateur est un administrateur
    current_user = get_jwt_identity()
    user = User.query.filter_by(username=current_user).first()
    
    if not user or user.role != 'admin':
        return jsonify({'message': 'Accès non autorisé. Vous devez être administrateur.'}), 403
    
    users = User.query.all()
    return jsonify([user.to_dict() for user in users]), 200

@app.route('/api/users', methods=['POST'])
@jwt_required()
def create_user():
    # Vérifier si l'utilisateur est un administrateur
    current_user = get_jwt_identity()
    admin_user = User.query.filter_by(username=current_user).first()
    
    if not admin_user or admin_user.role != 'admin':
        return jsonify({'message': 'Accès non autorisé. Vous devez être administrateur.'}), 403
    
    data = request.get_json()
    
    # Vérifier que tous les champs requis sont présents
    if not all(k in data for k in ['username', 'password', 'name', 'role']):
        return jsonify({'message': 'Tous les champs requis ne sont pas présents.'}), 400
    
    # Vérifier si le nom d'utilisateur existe déjà
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': 'Ce nom d\'utilisateur existe déjà.'}), 409
    
    # Créer un nouvel utilisateur
    new_user = User(
        username=data['username'],
        name=data['name'],
        role=data['role']
    )
    new_user.set_password(data['password'])
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({'message': 'Utilisateur créé avec succès.', 'user': new_user.to_dict()}), 201

@app.route('/api/users/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    # Vérifier si l'utilisateur est un administrateur
    current_user = get_jwt_identity()
    admin_user = User.query.filter_by(username=current_user).first()
    
    if not admin_user or admin_user.role != 'admin':
        return jsonify({'message': 'Accès non autorisé. Vous devez être administrateur.'}), 403
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'Utilisateur non trouvé.'}), 404
    
    data = request.get_json()
    
    # Mettre à jour les champs
    if 'username' in data and data['username'] != user.username:
        # Vérifier si le nouveau nom d'utilisateur existe déjà
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'message': 'Ce nom d\'utilisateur existe déjà.'}), 409
        user.username = data['username']
    
    if 'name' in data:
        user.name = data['name']
    
    if 'role' in data:
        user.role = data['role']
    
    if 'password' in data and data['password']:
        user.set_password(data['password'])
    
    db.session.commit()
    
    return jsonify({'message': 'Utilisateur mis à jour avec succès.', 'user': user.to_dict()}), 200

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    # Vérifier si l'utilisateur est un administrateur
    current_user = get_jwt_identity()
    admin_user = User.query.filter_by(username=current_user).first()
    
    if not admin_user or admin_user.role != 'admin':
        return jsonify({'message': 'Accès non autorisé. Vous devez être administrateur.'}), 403
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'Utilisateur non trouvé.'}), 404
    
    # Vérifier que l'utilisateur ne se supprime pas lui-même
    if user.username == current_user:
        return jsonify({'message': 'Vous ne pouvez pas supprimer votre propre compte.'}), 400
    
    # Supprimer l'utilisateur
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'message': 'Utilisateur supprimé avec succès.'}), 200

# Route pour créer une alerte prédictive à partir d'une prédiction
@app.route('/api/alerts/predictive', methods=['POST'])
@jwt_required()
def create_predictive_alert():
    if not request.is_json:
        return jsonify({"error": "Missing JSON in request"}), 400
    
    data = request.json
    required_fields = ['machine_id', 'sensor_type', 'value', 'risk_level', 'prediction', 'time_to_threshold']
    
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing {field} field"}), 400
    
    # Trouver la machine
    machine = Machine.query.filter_by(machine_id=data['machine_id']).first()
    if not machine:
        return jsonify({"error": "Machine not found"}), 404
    
    # Trouver le capteur correspondant
    sensor = Sensor.query.filter_by(machine_id=machine.id, type=data['sensor_type']).first()
    if not sensor:
        return jsonify({"error": "Sensor not found"}), 404
    
    # Vérifier si une alerte similaire existe déjà
    existing_alert = Alert.query.filter_by(
        machine_id=machine.id,
        sensor_type=data['sensor_type'],
        status='active'
    ).first()
    
    if existing_alert:
        return jsonify({"message": "Une alerte similaire existe déjà pour ce capteur"}), 200
    
    # Créer une nouvelle alerte prédictive
    timestamp = datetime.datetime.now()
    time_remaining = f"dans {data['time_to_threshold']} minutes"
    
    # Préparer un message spécifique pour les alertes prédictives
    message = f"ALERTE PREDITCTIVE: {data['prediction']} {time_remaining}"
    
    # Construire les suggestions
    suggestions = data.get('suggestions', [])
    if not suggestions:
        if data['sensor_type'] == 'temperature':
            suggestions = ["Vérifier le système de refroidissement", "Réduire la charge"]
        elif data['sensor_type'] == 'pressure':
            suggestions = ["Vérifier les vannes", "Préparer une intervention"]
        elif data['sensor_type'] == 'vibration':
            suggestions = ["Inspecter les roulements", "Vérifier l'équilibrage"]
    
    # Créer l'alerte
    alert = Alert(
        machine_id=machine.id,
        sensor_id=sensor.id,
        sensor_type=data['sensor_type'],
        value=data['value'],
        message=message,
        risk_level=data['risk_level'],
        suggestions=','.join(suggestions) if isinstance(suggestions, list) else suggestions,
        timestamp=timestamp,
        status='active'
    )
    
    db.session.add(alert)
    db.session.commit()
    
    # Préparer les données pour l'émission socket
    alert_data = {
        'id': alert.id,
        'machine_id': machine.machine_id,
        'sensor_type': data['sensor_type'],
        'value': data['value'],
        'message': message,
        'risk_level': data['risk_level'],
        'suggestions': suggestions if isinstance(suggestions, list) else suggestions.split(','),
        'timestamp': timestamp.isoformat(),
        'is_predictive': True,
        'time_to_threshold': data['time_to_threshold']
    }
    
    # Émettre l'événement pour informer les clients
    socketio.emit('new_alert', alert_data)
    
    return jsonify({
        "message": "Alerte prédictive créée avec succès",
        "alert": alert_data
    }), 201

# Créer une nouvelle machine
@app.route('/api/machines', methods=['POST'])
@jwt_required()
def admin_create_machine():
    data = request.get_json()
    logger.info(f"Tentative de création d'une machine: {data}")
    
    # Vérifier si l'utilisateur est un admin
    # En production, utiliser: current_user = get_jwt_identity()
    # Mais comme jwt est désactivé pour le test, nous simulons
    #current_user = User.query.filter_by(username='admin').first()
    #if not current_user or current_user.role != 'admin':
    #    return jsonify({"error": "Permission refusée. Seuls les administrateurs peuvent créer des machines"}), 403
    
    # Vérifier que les données requises sont présentes
    required_fields = ['machine_id', 'name', 'type', 'location']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Le champ '{field}' est requis"}), 400
    
    # Vérifier si une machine avec le même ID existe déjà
    existing_machine = Machine.query.filter_by(machine_id=data['machine_id']).first()
    if existing_machine:
        return jsonify({"error": f"Une machine avec l'ID '{data['machine_id']}' existe déjà"}), 400
    
    # Créer la nouvelle machine
    new_machine = Machine(
        machine_id=data['machine_id'],
        name=data['name'],
        description=data.get('description', ''),
        status=data.get('status', 'offline'),
        type=data['type'],
        location=data['location']
    )
    
    db.session.add(new_machine)
    db.session.commit()
    
    # Ajouter les capteurs si spécifiés
    if 'sensors' in data and isinstance(data['sensors'], list):
        for sensor_type in data['sensors']:
            # Déterminer les valeurs par défaut selon le type de capteur
            if sensor_type == 'temperature':
                unit = '°C'
                min_value = 0
                max_value = 100
            elif sensor_type == 'pressure':
                unit = 'bar'
                min_value = 0
                max_value = 15
            elif sensor_type == 'vibration':
                unit = 'Hz'
                min_value = 0
                max_value = 250
            else:
                unit = 'unité'
                min_value = 0
                max_value = 100
            
            sensor = Sensor(
                machine_id=new_machine.id,
                type=sensor_type,
                unit=unit,
                min_value=min_value,
                max_value=max_value
            )
            db.session.add(sensor)
        
        db.session.commit()
    
    logger.info(f"Machine créée avec succès: {new_machine.machine_id}")
    
    # Retourner les données de la machine créée
    return jsonify({
        'id': new_machine.id,
        'machine_id': new_machine.machine_id,
        'name': new_machine.name,
        'description': new_machine.description,
        'status': new_machine.status,
        'type': new_machine.type,
        'location': new_machine.location
    }), 201

# Mettre à jour une machine existante
@app.route('/api/machines/<machine_id>', methods=['PUT'])
@jwt_required()
def admin_update_machine(machine_id):
    data = request.get_json()
    logger.info(f"Tentative de mise à jour de la machine {machine_id}: {data}")
    
    # Vérifier si l'utilisateur est un admin
    # En production, utiliser: current_user = get_jwt_identity()
    # Mais comme jwt est désactivé pour le test, nous simulons
    #current_user = User.query.filter_by(username='admin').first()
    #if not current_user or current_user.role != 'admin':
    #    return jsonify({"error": "Permission refusée. Seuls les administrateurs peuvent modifier des machines"}), 403
    
    # Récupérer la machine
    machine = Machine.query.filter_by(machine_id=machine_id).first()
    if not machine:
        return jsonify({"error": f"Machine avec ID '{machine_id}' non trouvée"}), 404
    
    # Mettre à jour les champs modifiables
    if 'name' in data:
        machine.name = data['name']
    if 'description' in data:
        machine.description = data['description']
    if 'status' in data:
        machine.status = data['status']
    if 'type' in data:
        machine.type = data['type']
    if 'location' in data:
        machine.location = data['location']
    
    # Gérer les capteurs si spécifiés
    if 'sensors' in data and isinstance(data['sensors'], list):
        # Récupérer les capteurs existants
        existing_sensors = {sensor.type: sensor for sensor in machine.sensors}
        
        # Supprimer les capteurs qui ne sont plus dans la liste
        for sensor_type, sensor in existing_sensors.items():
            if sensor_type not in data['sensors']:
                db.session.delete(sensor)
        
        # Ajouter les nouveaux capteurs
        for sensor_type in data['sensors']:
            if sensor_type not in existing_sensors:
                # Déterminer les valeurs par défaut selon le type de capteur
                if sensor_type == 'temperature':
                    unit = '°C'
                    min_value = 0
                    max_value = 100
                elif sensor_type == 'pressure':
                    unit = 'bar'
                    min_value = 0
                    max_value = 15
                elif sensor_type == 'vibration':
                    unit = 'Hz'
                    min_value = 0
                    max_value = 250
                else:
                    unit = 'unité'
                    min_value = 0
                    max_value = 100
                
                sensor = Sensor(
                    machine_id=machine.id,
                    type=sensor_type,
                    unit=unit,
                    min_value=min_value,
                    max_value=max_value
                )
                db.session.add(sensor)
    
    db.session.commit()
    
    logger.info(f"Machine {machine_id} mise à jour avec succès")
    
    # Retourner les données de la machine mise à jour
    sensors = [sensor.type for sensor in machine.sensors]
    return jsonify({
        'id': machine.id,
        'machine_id': machine.machine_id,
        'name': machine.name,
        'description': machine.description,
        'status': machine.status,
        'type': machine.type,
        'location': machine.location,
        'sensors': sensors
    }), 200

# Supprimer une machine
@app.route('/api/machines/<machine_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_machine(machine_id):
    logger.info(f"Tentative de suppression de la machine {machine_id}")
    
    # Vérifier si l'utilisateur est un admin
    # En production, utiliser: current_user = get_jwt_identity()
    # Mais comme jwt est désactivé pour le test, nous simulons
    #current_user = User.query.filter_by(username='admin').first()
    #if not current_user or current_user.role != 'admin':
    #    return jsonify({"error": "Permission refusée. Seuls les administrateurs peuvent supprimer des machines"}), 403
    
    # Récupérer la machine
    machine = Machine.query.filter_by(machine_id=machine_id).first()
    if not machine:
        return jsonify({"error": f"Machine avec ID '{machine_id}' non trouvée"}), 404
    
    # Supprimer tous les capteurs associés
    Sensor.query.filter_by(machine_id=machine.id).delete()
    
    # Supprimer la machine
    db.session.delete(machine)
    db.session.commit()
    
    logger.info(f"Machine {machine_id} supprimée avec succès")
    
    return jsonify({"message": f"Machine {machine_id} supprimée avec succès"}), 200

# Récupérer la liste des machines
@app.route('/api/machines', methods=['GET'])
@jwt_required()
def list_all_machines():
    machines = Machine.query.all()
    machine_list = []
    
    for machine in machines:
        sensors = [sensor.type for sensor in machine.sensors]
        machine_list.append({
            'id': machine.id,
            'machine_id': machine.machine_id,
            'name': machine.name,
            'description': machine.description,
            'status': machine.status,
            'type': machine.type,
            'location': machine.location,
            'sensors': sensors
        })
    
    return jsonify(machine_list), 200

# Socket.IO événements
@socketio.on('connect')
def handle_connect():
    logger.info(f"Client connecté: {request.sid}")
    socketio.emit('welcome', {
        'message': 'Connecté au serveur de surveillance industrielle',
        'timestamp': datetime.datetime.now().isoformat(),
        'update_interval': DATA_UPDATE_INTERVAL
    })

@socketio.on('disconnect')
def handle_disconnect():
    logger.info(f"Client déconnecté: {request.sid}")

@socketio.on('subscribe')
def handle_subscribe(data):
    machine_id = data.get('machine_id')
    if machine_id:
        # Rejoindre la salle spécifique à cette machine
        for room in socketio.rooms(request.sid):
            if room != request.sid:
                socketio.leave_room(room)
        socketio.join_room(machine_id)
        logger.info(f"Client {request.sid} abonné à la machine {machine_id}")
        
        # Envoyer l'état actuel de la machine
        machine = Machine.query.filter_by(machine_id=machine_id).first()
        if machine:
            socketio.emit('machine_status', {
                'machine_id': machine_id,
                'status': machine.status,
                'timestamp': datetime.datetime.now().isoformat()
            }, room=request.sid)
    else:
        # Si pas de machine_id, s'abonner à toutes les mises à jour
        logger.info(f"Client {request.sid} abonné à toutes les mises à jour")

@socketio.on('unsubscribe')
def handle_unsubscribe(data):
    machine_id = data.get('machine_id')
    if machine_id:
        socketio.leave_room(machine_id)
        logger.info(f"Client {request.sid} désabonné de la machine {machine_id}")

if __name__ == '__main__':
    print("Démarrage du serveur d'API pour le Système de Surveillance Industrielle...")
    print("API disponible sur http://localhost:5000")
    
    try:
        app.run(host='0.0.0.0', port=5000, debug=(os.environ.get('FLASK_ENV') == 'development'))
    except KeyboardInterrupt:
        logger.info("Arrêt du serveur...")
        scheduler.shutdown()
        print("Serveur arrêté.")
    except Exception as e:
        logger.error(f"Erreur lors du démarrage du serveur: {str(e)}")
        scheduler.shutdown()
        print(f"Erreur: {str(e)}")

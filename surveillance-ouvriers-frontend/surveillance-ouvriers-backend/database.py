import os
import time
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
import pandas as pd
import numpy as np

# Load environment variables
load_dotenv()

# SQLAlchemy instance will be initialized in the app.py file
db = SQLAlchemy()

def get_database_uri():
    """
    Returns the database URI for SQLAlchemy configuration
    """
    db_type = os.environ.get('DB_TYPE', 'sqlite')
    
    if db_type == 'sqlite':
        sqlite_db = os.environ.get('SQLITE_DB', 'industrial_monitoring.db')
        return f"sqlite:///{sqlite_db}"
    elif db_type == 'postgres':
        postgres_user = os.environ.get('POSTGRES_USER', 'postgres')
        postgres_password = os.environ.get('POSTGRES_PASSWORD', 'password')
        postgres_host = os.environ.get('POSTGRES_HOST', 'localhost')
        postgres_port = os.environ.get('POSTGRES_PORT', '5432')
        postgres_db = os.environ.get('POSTGRES_DB', 'industrial_monitoring')
        
        return f"postgresql://{postgres_user}:{postgres_password}@{postgres_host}:{postgres_port}/{postgres_db}"
    else:
        raise ValueError(f"Unsupported database type: {db_type}")

def init_db(app):
    """
    Initialize the database with the Flask application
    """
    # Configure the SQLAlchemy part of the app instance
    app.config['SQLALCHEMY_DATABASE_URI'] = get_database_uri()
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize SQLAlchemy with the app
    db.init_app(app)
    
    # Create tables if they don't exist
    with app.app_context():
        db.create_all()
        
        # Setup TimescaleDB if PostgreSQL is used
        db_type = os.environ.get('DB_TYPE', 'sqlite')
        if db_type == 'postgres':
            try:
                # Create TimescaleDB extension if it doesn't exist
                db.session.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"))
                
                # Convert sensor_data table to hypertable if it exists
                # This makes time-series queries much more efficient
                db.session.execute(text("""
                    SELECT create_hypertable('sensor_data', 'timestamp', 
                                           if_not_exists => TRUE, 
                                           migrate_data => TRUE);
                """))
                
                # Convert alerts table to hypertable for time-series alerts
                db.session.execute(text("""
                    SELECT create_hypertable('alerts', 'timestamp', 
                                           if_not_exists => TRUE, 
                                           migrate_data => TRUE);
                """))
                
                db.session.commit()
                print("TimescaleDB configured successfully.")
            except Exception as e:
                db.session.rollback()
                print(f"TimescaleDB configuration warning (non-fatal): {str(e)}")
                print("Continuing with standard PostgreSQL.")
        
        # Import models here to avoid circular imports
        from models import User, Machine, Sensor
        
        # Check if we need to initialize with sample data
        if User.query.count() == 0:
            # Create default users
            from models import User
            
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
                type='Drill Press',
                location='Section A',
                status='active'
            )
            
            machine2 = Machine(
                machine_id='machine-002',
                name='Machine Beta',
                type='Hydraulic Press',
                location='Section B',
                status='active'
            )
            
            machine3 = Machine(
                machine_id='machine-003',
                name='Machine Gamma',
                type='CNC Mill',
                location='Section C',
                status='maintenance'
            )
            
            db.session.add(machine1)
            db.session.add(machine2)
            db.session.add(machine3)
            
            # Add sensors
            sensors1 = [
                Sensor(type='temperature', machine=machine1),
                Sensor(type='pressure', machine=machine1),
                Sensor(type='vibration', machine=machine1)
            ]
            
            sensors2 = [
                Sensor(type='temperature', machine=machine2),
                Sensor(type='pressure', machine=machine2),
                Sensor(type='vibration', machine=machine2)
            ]
            
            sensors3 = [
                Sensor(type='temperature', machine=machine3),
                Sensor(type='pressure', machine=machine3),
                Sensor(type='vibration', machine=machine3)
            ]
            
            for sensor in sensors1 + sensors2 + sensors3:
                db.session.add(sensor)
            
            # Commit the changes
            db.session.commit()
            
            print("Database initialized with sample data.")


# Fonctions utilitaires pour les requêtes temporelles

def get_sensor_data_timeseries(machine_id, sensor_type, start_time=None, end_time=None, interval='1 minute'):
    """
    Récupère les données de capteur pour une machine et un type de capteur donné,
    agrégées sur un intervalle de temps.
    
    Args:
        machine_id: ID de la machine
        sensor_type: Type de capteur (temperature, pressure, etc.)
        start_time: Heure de début (datetime ou string ISO format)
        end_time: Heure de fin (datetime ou string ISO format)
        interval: Intervalle d'agrégation ('1 minute', '5 minutes', '1 hour', etc.)
        
    Returns:
        DataFrame pandas avec les colonnes timestamp, avg_value, min_value, max_value
    """
    from models import Machine, Sensor, SensorData
    
    # Trouver la machine
    machine = Machine.query.filter_by(machine_id=machine_id).first()
    if not machine:
        return pd.DataFrame()
    
    # Trouver le capteur
    sensor = Sensor.query.filter_by(machine_id=machine.id, type=sensor_type).first()
    if not sensor:
        return pd.DataFrame()
    
    # Construire la requête de base
    query = db.session.query(SensorData).filter(SensorData.sensor_id == sensor.id)
    
    # Ajouter les filtres de temps si nécessaire
    if start_time:
        query = query.filter(SensorData.timestamp >= start_time)
    if end_time:
        query = query.filter(SensorData.timestamp <= end_time)
    
    # Exécuter la requête
    results = query.order_by(SensorData.timestamp).all()
    
    # Convertir en DataFrame pandas
    data = {
        'timestamp': [r.timestamp for r in results],
        'value': [r.value for r in results]
    }
    
    df = pd.DataFrame(data)
    
    # Si pas de données, retourner un DataFrame vide
    if df.empty:
        return df
        
    # Définir timestamp comme index
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df.set_index('timestamp', inplace=True)
    
    # Agréger par intervalle si SQLite
    if os.environ.get('DB_TYPE') == 'sqlite':
        # Pour SQLite, nous faisons l'agrégation en pandas
        resampled = df.resample(interval).agg({
            'value': ['mean', 'min', 'max']
        })
        
        # Aplatir les colonnes multi-index
        resampled.columns = ['avg_value', 'min_value', 'max_value']
        resampled.reset_index(inplace=True)
        return resampled
    else:
        # Pour PostgreSQL/TimescaleDB, nous utilisons une requête SQL directe
        # qui sera beaucoup plus efficace
        sql = f"""
        SELECT 
            time_bucket('{interval}', sd.timestamp) as bucket,
            AVG(sd.value) as avg_value,
            MIN(sd.value) as min_value,
            MAX(sd.value) as max_value
        FROM 
            sensor_data sd
        JOIN 
            sensors s ON sd.sensor_id = s.id
        JOIN 
            machines m ON s.machine_id = m.id
        WHERE 
            m.machine_id = :machine_id AND
            s.type = :sensor_type
        """
        
        params = {
            'machine_id': machine_id,
            'sensor_type': sensor_type
        }
        
        if start_time:
            sql += " AND sd.timestamp >= :start_time"
            params['start_time'] = start_time
            
        if end_time:
            sql += " AND sd.timestamp <= :end_time"
            params['end_time'] = end_time
            
        sql += """
        GROUP BY 
            bucket
        ORDER BY 
            bucket
        """
        
        try:
            result = db.session.execute(text(sql), params)
            df_result = pd.DataFrame(result.fetchall(), 
                                  columns=['timestamp', 'avg_value', 'min_value', 'max_value'])
            return df_result
        except Exception as e:
            print(f"Error in time-series query: {str(e)}")
            return pd.DataFrame()


def get_anomaly_count_by_machine(start_time=None, end_time=None, interval='1 hour'):
    """
    Récupère le nombre d'anomalies par machine sur un intervalle de temps.
    
    Args:
        start_time: Heure de début (datetime ou string ISO format)
        end_time: Heure de fin (datetime ou string ISO format)
        interval: Intervalle d'agrégation ('1 minute', '5 minutes', '1 hour', etc.)
        
    Returns:
        DataFrame pandas avec les colonnes timestamp, machine_id, anomaly_count
    """
    from models import Machine, Alert
    
    # Requête SQLite
    if os.environ.get('DB_TYPE') == 'sqlite':
        # Construire la requête de base
        query = db.session.query(Alert).join(Machine)
        
        # Ajouter les filtres de temps si nécessaire
        if start_time:
            query = query.filter(Alert.timestamp >= start_time)
        if end_time:
            query = query.filter(Alert.timestamp <= end_time)
        
        # Exécuter la requête
        results = query.order_by(Alert.timestamp).all()
        
        # Convertir en DataFrame pandas
        data = {
            'timestamp': [r.timestamp for r in results],
            'machine_id': [r.machine.machine_id for r in results]
        }
        
        df = pd.DataFrame(data)
        
        # Si pas de données, retourner un DataFrame vide
        if df.empty:
            return df
            
        # Définir timestamp comme index
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df.set_index('timestamp', inplace=True)
        
        # Compter les anomalies par machine et par intervalle de temps
        counts = df.groupby([pd.Grouper(freq=interval), 'machine_id']).size().reset_index(name='anomaly_count')
        
        return counts
    else:
        # Pour PostgreSQL/TimescaleDB
        sql = f"""
        SELECT 
            time_bucket('{interval}', a.timestamp) as bucket,
            m.machine_id,
            COUNT(*) as anomaly_count
        FROM 
            alerts a
        JOIN 
            machines m ON a.machine_id = m.id
        """
        
        params = {}
        
        if start_time or end_time:
            sql += " WHERE "
            
        if start_time:
            sql += "a.timestamp >= :start_time"
            params['start_time'] = start_time
            
        if end_time:
            if start_time:
                sql += " AND "
            sql += "a.timestamp <= :end_time"
            params['end_time'] = end_time
            
        sql += """
        GROUP BY 
            bucket, m.machine_id
        ORDER BY 
            bucket, m.machine_id
        """
        
        try:
            result = db.session.execute(text(sql), params)
            df_result = pd.DataFrame(result.fetchall(), 
                                 columns=['timestamp', 'machine_id', 'anomaly_count'])
            return df_result
        except Exception as e:
            print(f"Error in anomaly count query: {str(e)}")
            return pd.DataFrame()


if __name__ == '__main__':
    # This is for direct execution of this file
    # It will create a temporary Flask app just to initialize the database
    from flask import Flask
    app = Flask(__name__)
    init_db(app)
    print("Database initialized successfully.")

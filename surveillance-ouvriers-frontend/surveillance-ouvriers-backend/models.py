from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import bcrypt

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='worker')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_password(self, password):
        self.password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'name': self.name,
            'role': self.role
        }

class Machine(db.Model):
    __tablename__ = 'machines'
    
    id = db.Column(db.Integer, primary_key=True)
    machine_id = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    location = db.Column(db.String(100))
    status = db.Column(db.String(20), default='active')
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    sensors = db.relationship('Sensor', backref='machine', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'machine_id': self.machine_id,
            'name': self.name,
            'type': self.type,
            'location': self.location,
            'status': self.status,
            'description': self.description,
            'sensors': [s.type for s in self.sensors]
        }

class Sensor(db.Model):
    __tablename__ = 'sensors'
    
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), nullable=False)
    machine_id = db.Column(db.Integer, db.ForeignKey('machines.id'), nullable=False)
    unit = db.Column(db.String(20), nullable=True)  # °C, bar, Hz, etc.
    min_value = db.Column(db.Float, nullable=True)  # Valeur minimale acceptable
    max_value = db.Column(db.Float, nullable=True)  # Valeur maximale acceptable
    normal_range_min = db.Column(db.Float, nullable=True)  # Valeur min de la plage normale
    normal_range_max = db.Column(db.Float, nullable=True)  # Valeur max de la plage normale
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    sensor_data = db.relationship('SensorData', backref='sensor', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'machine_id': self.machine_id,
            'unit': self.unit,
            'min_value': self.min_value,
            'max_value': self.max_value,
            'normal_range_min': self.normal_range_min,
            'normal_range_max': self.normal_range_max
        }

class SensorData(db.Model):
    __tablename__ = 'sensor_data'
    
    id = db.Column(db.Integer, primary_key=True)
    sensor_id = db.Column(db.Integer, db.ForeignKey('sensors.id'), nullable=False)
    value = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'sensor_id': self.sensor_id,
            'sensor_type': self.sensor.type,
            'machine_id': self.sensor.machine.machine_id,
            'value': self.value,
            'timestamp': self.timestamp.isoformat()
        }

class Alert(db.Model):
    __tablename__ = 'alerts'
    
    id = db.Column(db.Integer, primary_key=True)
    machine_id = db.Column(db.Integer, db.ForeignKey('machines.id'), nullable=False)
    sensor_id = db.Column(db.Integer, db.ForeignKey('sensors.id'), nullable=False)
    sensor_type = db.Column(db.String(50), nullable=True)  # Ajouter le type de capteur directement
    value = db.Column(db.Float, nullable=False)
    message = db.Column(db.Text, nullable=True)  # Message de prédiction
    risk_level = db.Column(db.Float, nullable=True)  # Niveau de risque (0-100)
    suggestions = db.Column(db.Text, nullable=True)  # Suggestions séparées par des virgules
    status = db.Column(db.String(20), default='active')
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    
    # Relations
    machine = db.relationship('Machine')
    sensor = db.relationship('Sensor')
    resolver = db.relationship('User', foreign_keys=[resolved_by])
    
    def to_dict(self):
        return {
            'id': self.id,
            'machine_id': self.machine.machine_id,
            'sensor_type': self.sensor_type or self.sensor.type,
            'value': self.value,
            'message': self.message,
            'risk_level': self.risk_level,
            'suggestions': self.suggestions.split(',') if self.suggestions else [],
            'status': self.status,
            'timestamp': self.timestamp.isoformat(),
            'resolved_by': self.resolver.username if self.resolver else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None
        }

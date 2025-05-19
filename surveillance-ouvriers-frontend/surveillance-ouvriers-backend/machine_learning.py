import math
import numpy as np
from datetime import datetime, timedelta
import joblib
import os
import time
from sklearn.ensemble import IsolationForest
import pandas as pd
from collections import deque

class AdvancedAnomalyDetector:
    """
    Un détecteur d'anomalies intelligent pour la surveillance des capteurs,
    utilisant un modèle pré-entraîné pour des prédictions cohérentes.
    """
    
    def __init__(self):
        """Initialise le détecteur d'anomalies avec un modèle pré-entraîné."""
        self.is_trained = True
        self.model_path = "anomaly_model.joblib"
        
        # Définir des seuils pour chaque type de capteur - valeurs normales et critiques
        self.thresholds = {
            'temperature': {'min_normal': 35, 'max_normal': 70, 'critical_low': 20, 'critical_high': 85},
            'pressure': {'min_normal': 70, 'max_normal': 120, 'critical_low': 50, 'critical_high': 150},
            'vibration': {'min_normal': 0.1, 'max_normal': 0.7, 'critical_low': 0.05, 'critical_high': 1.2}
        }
        
        # Définir les suggestions par type de capteur et condition
        self.suggestions = {
            'temperature': {
                'high': [
                    "Vérifier le système de refroidissement",
                    "Réduire la charge de travail de la machine",
                    "Inspecter les ventilateurs et le circuit de refroidissement"
                ],
                'low': [
                    "Vérifier le système de chauffage",
                    "Vérifier les capteurs de température pour d'éventuelles erreurs",
                    "Isoler la zone pour maintenir la température"
                ]
            },
            'pressure': {
                'high': [
                    "Réduire la pression dans le système",
                    "Vérifier les vannes de pression", 
                    "Inspecter les joints d'étanchéité"
                ],
                'low': [
                    "Vérifier les fuites possibles",
                    "Augmenter l'alimentation en fluide",
                    "Calibrer les capteurs de pression"
                ]
            },
            'vibration': {
                'high': [
                    "Vérifier l'équilibrage de la machine",
                    "Inspecter les roulements et engrenages",
                    "Réduire la vitesse de rotation"
                ],
                'low': [
                    "Vérifier que la machine fonctionne correctement",
                    "S'assurer que le capteur est correctement fixé",
                    "Calibrer le capteur de vibration"
                ]
            }
        }
        
        # Historique des valeurs pour chaque capteur (pour analyse de tendance déterministe)
        self.sensor_history = {}
        
        # Historique de risque pour une évolution cohérente
        self.risk_history = {}
        
        # Modèles pré-entraînés par type de capteur
        self.models = self._load_or_create_models()
        
    def _load_or_create_models(self):
        """Charge les modèles existants ou en crée de nouveaux si nécessaires."""
        models = {}
        
        # Vérifier si les modèles existent déjà, sinon les créer
        for sensor_type in self.thresholds.keys():
            model_file = f"model_{sensor_type}.joblib"
            
            if os.path.exists(model_file):
                try:
                    # Charger le modèle existant
                    models[sensor_type] = joblib.load(model_file)
                    print(f"Modèle {sensor_type} chargé depuis {model_file}")
                except Exception as e:
                    print(f"Erreur lors du chargement du modèle {model_file}: {e}")
                    # Créer un nouveau modèle en cas d'erreur
                    models[sensor_type] = self._create_new_model(sensor_type)
            else:
                # Créer un nouveau modèle
                models[sensor_type] = self._create_new_model(sensor_type)
                
        return models
    
    def _create_new_model(self, sensor_type):
        """Crée et entraîne un nouveau modèle pour un type de capteur spécifique."""
        print(f"Création d'un nouveau modèle pour {sensor_type}")
        
        # Générer des données d'entraînement spécifiques au type de capteur
        train_data = self._generate_training_data(sensor_type, n_samples=5000)
        
        # Créer et entraîner le modèle
        model = IsolationForest(
            n_estimators=100,
            max_samples='auto',
            contamination=0.05,  # 5% des données sont considérées comme des anomalies
            random_state=42  # Pour la reproductibilité
        )
        
        # Extraire les caractéristiques pertinentes et entraîner
        X = np.array(train_data['values']).reshape(-1, 1)
        model.fit(X)
        
        # Sauvegarder le modèle
        model_file = f"model_{sensor_type}.joblib"
        joblib.dump(model, model_file)
        print(f"Modèle {sensor_type} enregistré dans {model_file}")
        
        return model
    
    def _generate_training_data(self, sensor_type, n_samples=5000):
        """Génère des données d'entraînement réalistes pour un type de capteur spécifique"""
        print(f"Génération de données d'entraînement pour {sensor_type}")
        
        # Récupérer les seuils pour ce type de capteur
        thresholds = self.thresholds[sensor_type]
        min_normal = thresholds['min_normal']
        max_normal = thresholds['max_normal']
        critical_low = thresholds['critical_low']
        critical_high = thresholds['critical_high']
        
        # Calculer la plage normale et anormale
        normal_range = max_normal - min_normal
        
        # Générer des valeurs normales (80% des échantillons)
        normal_count = int(n_samples * 0.8)
        normal_values = np.random.normal(
            loc=(min_normal + max_normal) / 2,  # Moyenne au milieu de la plage normale
            scale=normal_range / 6,  # ~99.7% des valeurs dans la plage normale (±3σ)
            size=normal_count
        )
        
        # Limiter les valeurs normales à la plage normale
        normal_values = np.clip(normal_values, min_normal, max_normal)
        
        # Générer des anomalies basses (10% des échantillons)
        low_anomaly_count = int(n_samples * 0.1)
        if critical_low < min_normal:
            low_anomaly_values = np.random.uniform(
                low=critical_low,
                high=min_normal * 0.9,  # Légèrement en dessous du minimum normal
                size=low_anomaly_count
            )
        else:
            # Si pas de seuil critique bas défini, utiliser une valeur arbitraire
            low_anomaly_values = np.random.uniform(
                low=min_normal * 0.5,
                high=min_normal * 0.9,
                size=low_anomaly_count
            )
        
        # Générer des anomalies hautes (10% des échantillons)
        high_anomaly_count = int(n_samples * 0.1)
        high_anomaly_values = np.random.uniform(
            low=max_normal * 1.1,  # Légèrement au-dessus du maximum normal
            high=critical_high,
            size=high_anomaly_count
        )
        
        # Combiner toutes les valeurs
        all_values = np.concatenate([normal_values, low_anomaly_values, high_anomaly_values])
        
        # Mélanger les valeurs
        np.random.shuffle(all_values)
        
        # Créer un DataFrame avec les valeurs
        df = pd.DataFrame({
            'values': all_values,
            'timestamp': [datetime.now() - timedelta(minutes=i) for i in range(len(all_values))]
        })
        
        return df
        
    def generate_sample_training_data(self, n_samples=1000):
        """Génère des données d'entraînement pour tous les types de capteurs"""
        data = []
        
        # Types de capteurs
        sensor_types = list(self.thresholds.keys())
        
        # Machines
        machine_ids = ['machine-001', 'machine-002']
        
        # Générer des données pour chaque combinaison machine/capteur
        for machine_id in machine_ids:
            for sensor_type in sensor_types:
                # Générer des valeurs pour ce type de capteur
                sensor_df = self._generate_training_data(sensor_type, n_samples=n_samples // (len(machine_ids) * len(sensor_types)))
                
                # Convertir en liste de dictionnaires
                for _, row in sensor_df.iterrows():
                    data.append({
                        'machine_id': machine_id,
                        'sensor_type': sensor_type,
                        'value': float(row['values']),
                        'timestamp': row['timestamp'].isoformat()
                    })
        
        return data
    
    def predict(self, data):
        """Prédire les anomalies et risques associés avec une évolution logique et cohérente"""
        sensor_type = data['sensor_type']
        value = data['value']
        machine_id = data['machine_id']
        
        # Convertir machine_id en string si ce n'est pas déjà le cas
        if isinstance(machine_id, int):
            machine_id = str(machine_id)
        
        # Vérifier si le type de capteur est pris en charge
        if sensor_type not in self.thresholds:
            return {
                'risk_probability': 0,
                'prediction': f"Type de capteur '{sensor_type}' non pris en charge",
                'suggestions': ["Consulter la documentation pour les types de capteurs pris en charge"],
                'anomaly': False,
                'time_to_threshold': 30,
                'future_value': value
            }
        
        # Clé unique pour ce capteur
        sensor_key = f"{machine_id}_{sensor_type}"
        
        # Initialiser l'historique du capteur si nécessaire
        if sensor_key not in self.sensor_history:
            self.sensor_history[sensor_key] = deque(maxlen=10)  # Garder les 10 dernières valeurs
            self.risk_history[sensor_key] = deque(maxlen=10)    # Garder les 10 derniers risques
        
        # Ajouter la valeur actuelle à l'historique
        self.sensor_history[sensor_key].append(value)
        
        # Utiliser le modèle pré-entraîné pour détecter des anomalies
        prediction_result = -1
        try:
            # Utiliser le modèle pour ce type de capteur
            model = self.models[sensor_type]
            
            # Prédire si la valeur est une anomalie (-1) ou normale (1)
            prediction_array = model.predict(np.array([[value]]))
            prediction_result = prediction_array[0]
            
            # Score d'anomalie (plus négatif = plus anormal)
            anomaly_score = model.decision_function(np.array([[value]]))[0]
            
            # Convertir le score en probabilité de risque (0-100%)
            # Plus le score est négatif, plus la probabilité de risque est élevée
            risk_probability = min(100, max(0, 50 - (anomaly_score * 20)))
            
            # Si nous avons un historique, affiner la probabilité de risque
            if len(self.sensor_history[sensor_key]) > 1:
                risk_probability = self._calculate_refined_risk(sensor_key, value, risk_probability, prediction_result)
        except Exception as e:
            print(f"Erreur lors de la prédiction pour {sensor_type}: {e}")
            # Fallback : utiliser une méthode de détection basée sur les seuils
            prediction_result, risk_probability = self._threshold_based_detection(sensor_type, value)
        
        # Ajouter le risque calculé à l'historique
        self.risk_history[sensor_key].append(risk_probability)
        
        # Déterminer l'état et les suggestions en fonction du niveau de risque
        state, prediction_message, suggestions = self._get_state_and_suggestions(sensor_type, value, risk_probability)
        
        # Estimer la valeur future et le temps avant d'atteindre un seuil critique
        future_value, time_to_threshold = self._estimate_future_trends(sensor_key, sensor_type, value, risk_probability)
        
        # Vérifier si c'est une anomalie
        is_anomaly = risk_probability >= 65  # Considérer comme anomalie si risque >= 65%
                
        # Créer et retourner la prédiction avec une structure compatible avec app.py
        prediction = {
            'risk_probability': round(risk_probability, 1),
            'prediction': prediction_message,  # String au lieu d'un dictionnaire
            'suggestions': suggestions,
            'anomaly': is_anomaly,
            'time_to_threshold': time_to_threshold,
            'future_value': future_value
        }
        
        return prediction
    
    def _calculate_refined_risk(self, sensor_key, value, initial_risk, prediction_result):
        """Affine le calcul du risque en tenant compte de l'historique et de la tendance"""
        history = list(self.sensor_history[sensor_key])
        risk_history = list(self.risk_history[sensor_key]) if sensor_key in self.risk_history else []
        
        # Si nous n'avons pas assez d'historique, utiliser simplement le risque initial
        if len(history) < 3 or len(risk_history) == 0:
            return initial_risk
        
        # Calculer la tendance des valeurs (augmentation, diminution, stable)
        recent_values = history[-3:]
        if all(recent_values[i] < recent_values[i+1] for i in range(len(recent_values)-1)):
            trend = "augmentation"
        elif all(recent_values[i] > recent_values[i+1] for i in range(len(recent_values)-1)):
            trend = "diminution"
        else:
            trend = "stable"
        
        # Calculer la variance pour détecter l'instabilité
        variance = np.var(recent_values)
        
        # Calculer la pente moyenne du risque récent
        mean_risk_slope = 0
        if len(risk_history) >= 3:
            risk_diffs = [risk_history[i+1] - risk_history[i] for i in range(len(risk_history)-1)]
            mean_risk_slope = sum(risk_diffs) / len(risk_diffs)
        
        # Ajuster le risque en fonction de la tendance et de la variance
        adjusted_risk = initial_risk
        
        # Ajustement basé sur la tendance des valeurs
        if prediction_result == -1:  # Si c'est déjà une anomalie selon le modèle
            if trend == "augmentation":
                adjusted_risk += 10  # Augmenter davantage le risque si la tendance est à la hausse
            elif trend == "diminution":
                adjusted_risk -= 5   # Réduire légèrement le risque si la tendance est à la baisse
        else:  # Si c'est normal selon le modèle
            if trend == "augmentation":
                adjusted_risk += 5   # Augmenter légèrement le risque si la tendance est à la hausse
            elif trend == "diminution":
                adjusted_risk -= 2   # Réduire légèrement le risque si la tendance est à la baisse
        
        # Ajustement basé sur l'instabilité (variance)
        if variance > 10:
            adjusted_risk += 5  # Augmenter le risque si les valeurs sont instables
        
        # Ajustement basé sur la tendance du risque
        adjusted_risk += mean_risk_slope * 2
        
        # Assurer que le risque reste entre 0 et 100
        return min(100, max(0, adjusted_risk))
    
    def _threshold_based_detection(self, sensor_type, value):
        """Détection d'anomalie basée sur les seuils en cas de problème avec le modèle"""
        thresholds = self.thresholds[sensor_type]
        
        # Vérifier si la valeur est en dehors des limites normales
        if value < thresholds['min_normal'] or value > thresholds['max_normal']:
            # En dehors des limites normales - anomalie
            prediction = -1
            
            # Calculer le niveau de risque
            if value <= thresholds['critical_low'] or value >= thresholds['critical_high']:
                # Risque critique
                risk = 90 + min(10, (abs(value - thresholds['critical_high']) / 10) if value > thresholds['max_normal'] 
                               else (abs(value - thresholds['critical_low']) / 10))
            else:
                # Risque élevé mais non critique
                distance_from_normal = min(
                    abs(value - thresholds['min_normal']) if value < thresholds['min_normal'] else 0,
                    abs(value - thresholds['max_normal']) if value > thresholds['max_normal'] else 0
                )
                
                normal_range = thresholds['max_normal'] - thresholds['min_normal']
                risk = 65 + min(25, (distance_from_normal / normal_range) * 25)
        else:
            # Dans les limites normales
            prediction = 1
            
            # Calculer le risque en fonction de la proximité avec les limites
            distance_to_limit = min(
                abs(value - thresholds['min_normal']),
                abs(value - thresholds['max_normal'])
            )
            
            normal_range = thresholds['max_normal'] - thresholds['min_normal']
            risk_factor = 1 - (distance_to_limit / (normal_range / 2))
            
            risk = 10 + risk_factor * 30  # Risque entre 10% et 40%
        
        return prediction, risk

    def _get_state_and_suggestions(self, sensor_type, value, risk_probability):
        """Déterminer l'état du capteur et les suggestions associées"""
        thresholds = self.thresholds[sensor_type]
        
        if risk_probability >= 90:
            state = 'critical'
            prediction = f"{sensor_type.capitalize()} critique - Arrêt immédiat nécessaire"
            suggestions = self.suggestions[sensor_type]['high']
        elif risk_probability >= 75:
            state = 'high'
            prediction = f"{sensor_type.capitalize()} élevé - Action requise"
            suggestions = self.suggestions[sensor_type]['high']
        elif risk_probability >= 60:
            state = 'warning'
            prediction = f"{sensor_type.capitalize()} anormal - Surveillance recommandée"
            suggestions = self.suggestions[sensor_type]['high']
        elif value < thresholds['min_normal'] and risk_probability >= 40:
            state = 'low'
            prediction = f"{sensor_type.capitalize()} trop bas - Vérification nécessaire"
            suggestions = self.suggestions[sensor_type]['low']
        else:
            state = 'normal'
            prediction = f"{sensor_type.capitalize()} normal"
            suggestions = ["Aucune action nécessaire"]
        
        return state, prediction, suggestions
    
    def _estimate_future_trends(self, sensor_key, sensor_type, current_value, risk_probability):
        """Estimer la tendance future, y compris la valeur future et le temps avant seuil critique"""
        history = list(self.sensor_history[sensor_key]) if sensor_key in self.sensor_history else [current_value]
        thresholds = self.thresholds[sensor_type]
        
        # Si nous n'avons pas assez d'historique
        if len(history) < 3:
            # Estimation simple basée sur le risque actuel
            if risk_probability >= 75:
                time_to_threshold = int(5 + (100 - risk_probability) / 5)  # 5-10 minutes
                future_change = current_value * 0.1  # 10% de changement
                future_value = current_value + future_change if current_value > thresholds['max_normal'] else current_value - future_change
            elif risk_probability >= 60:
                time_to_threshold = int(10 + (75 - risk_probability))  # 10-25 minutes
                future_change = current_value * 0.05  # 5% de changement
                future_value = current_value + future_change if current_value > thresholds['max_normal'] else current_value - future_change
            else:
                time_to_threshold = 30
                future_value = current_value
        else:
            # Calculer la tendance basée sur l'historique
            recent = history[-3:]
            
            if len(recent) >= 2:
                # Calculer la pente moyenne des changements récents
                changes = [recent[i] - recent[i-1] for i in range(1, len(recent))]
                avg_change = sum(changes) / len(changes)
                
                # Estimer la valeur future en fonction de la tendance récente
                future_value = current_value + (avg_change * 3)  # Projeter 3 étapes dans le futur
                
                # Si la tendance est à la détérioration, estimer le temps avant seuil critique
                critical_threshold = thresholds['critical_high'] if avg_change > 0 else thresholds['critical_low']
                distance_to_threshold = abs(critical_threshold - current_value)
                
                # Si la tendance est significative
                if abs(avg_change) > 0.01:
                    # Estimer le temps en minutes avant d'atteindre le seuil critique
                    time_to_reach = distance_to_threshold / abs(avg_change)
                    # Convertir en minutes (supposons que chaque point de données représente environ 5 minutes)
                    time_to_threshold = max(0, int(time_to_reach * 5))
                    
                    # Limiter à 30 minutes maximum pour la prévision
                    time_to_threshold = min(30, time_to_threshold)
                else:
                    time_to_threshold = 30  # Stable, ne devrait pas atteindre le seuil dans les 30 prochaines minutes
            else:
                # Pas assez de données historiques pour la tendance
                time_to_threshold = 30
                future_value = current_value
        
        # Assurer que la valeur future reste dans une plage réaliste
        max_possible = thresholds['critical_high'] * 1.2
        min_possible = 0 if thresholds['critical_low'] <= 0 else thresholds['critical_low'] * 0.8
        
        future_value = min(max_possible, max(min_possible, future_value))
        
        return future_value, time_to_threshold

# Version plus simple pour éviter les erreurs
class IsolationForestModel(AdvancedAnomalyDetector):
    """Une version compatible du modèle pour l'API existante."""
    pass

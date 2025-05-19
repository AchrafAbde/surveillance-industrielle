import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  Alert
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TimelapseIcon from '@mui/icons-material/Timelapse';
import api from '../../services/api';

/**
 * Composant qui affiche les pru00e9dictions d'anomalies pour les 30 prochaines minutes
 */
const FuturePredictions = () => {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState('');
  const [machines, setMachines] = useState([]);
  const [updateCounter, setUpdateCounter] = useState(0); // Compteur pour suivre les actualisations
  const [machineHistory, setMachineHistory] = useState({}); // Pour stocker l'historique d'évolution

  // Lancer automatiquement l'analyse initiale et mettre en place une actualisation pu00e9riodique
  useEffect(() => {
    // Charger d'abord les machines
    fetchMachines();

    // Configurer une actualisation automatique toutes les 5 minutes
    const intervalId = setInterval(() => {
      fetchMachines().then(() => analyzeFuture());
    }, 5 * 60 * 1000); // 5 minutes en millisecondes

    // Nettoyer l'intervalle lors du du00e9montage du composant
    return () => clearInterval(intervalId);
  }, []); // Le tableau vide signifie que cet effet s'exu00e9cute uniquement au montage

  // Fonction pour ru00e9cupu00e9rer les machines actives
  const fetchMachines = async () => {
    try {
      const allMachines = await api.machines.getAll();
      
      // Filtrer les machines: uniquement celles qui sont actives
      const activeMachines = allMachines.filter(machine => 
        machine.status === 'active'
      );
      
      console.log('Machines actives pour pru00e9dictions:', activeMachines);
      setMachines(activeMachines);
      
      return activeMachines;
    } catch (error) {
      console.error('Erreur lors du chargement des machines:', error);
      setError('Impossible de charger les machines. Veuillez ru00e9essayer plus tard.');
      return [];
    }
  };

  // Fonction qui prédit la tendance future d'un capteur pour la démonstration
  const predictSensorTrend = (sensor, machineAge) => {
    // Pour la démonstration, créons un scénario parfaitement logique
    
    // SCÉNARIO DE DÉMONSTRATION LOGIQUE :
    // - Machine Alpha (machine-001) : Neuve, aucun problème (risque faible)
    // - Machine Beta (machine-002) : Usage normal, signes d'usure sur température (risque modéré)
    // - Machine Gamma (machine-003) : Usée, problèmes multiples prévisibles (risque élevé)
    // - Machine Delta (machine-004) : Critique, défaillance imminente (risque critique)
    
    const machineId = sensor.machineId;
    
    // Obtenir l'historique de cette machine+capteur ou créer un nouvel historique
    const sensorKey = `${machineId}-${sensor.sensor_type}`;
    const history = machineHistory[sensorKey] || {
      progression: 0,
      trend: 'stable', // stable, increasing, decreasing
      previousValues: [],
      anomalyDetected: false
    };
    
    // Définir les caractéristiques de base de chaque machine pour la démonstration
    let riskProbability = 0;
    let timeToThreshold = null;
    let futureValue = sensor.current_value;
    
    // 1. MACHINE ALPHA - NEUVE - ÉVOLUTION STABLE AVEC LÉGÈRE VARIATION
    if (machineId === 'machine-001') {
      // Machine neuve, tous les capteurs sont en bon état
      switch(sensor.sensor_type) {
        case 'temperature':
          // Risque généralement faible mais avec de petites variations
          riskProbability = 10 + (updateCounter % 3) + (history.progression / 10);
          futureValue = sensor.current_value * (1.01 + (history.progression * 0.001));
          // Une légère tendance à la hausse au fil du temps, mais reste dans la zone sûre
          timeToThreshold = null;
          break;
        case 'pressure':
          riskProbability = 5 + (updateCounter % 2) + (history.progression / 15);
          futureValue = sensor.current_value * (1.005 + (history.progression * 0.0005));
          timeToThreshold = null;
          break;
        case 'vibration':
          riskProbability = 8 + (updateCounter % 4) + (history.progression / 12);
          futureValue = sensor.current_value * (1.008 + (history.progression * 0.0008));
          timeToThreshold = null;
          break;
        default:
          break;
      }
    }
    
    // 2. MACHINE BETA - NORMALE - DÉGRADATION PROGRESSIVE DE LA TEMPÉRATURE
    else if (machineId === 'machine-002') {
      switch(sensor.sensor_type) {
        case 'temperature':
          // La température montre une détérioration progressive
          riskProbability = 40 + (updateCounter * 2) + (history.progression * 1.5);
          if (riskProbability > 75) riskProbability = 75; // Plafond
          
          // La valeur future augmente progressivement
          futureValue = sensor.current_value * (1.05 + (history.progression * 0.008));
          
          // Le temps avant problème diminue progressivement
          if (history.progression > 2) {
            timeToThreshold = 25 - Math.floor(history.progression * 0.8);
            if (timeToThreshold < 10) timeToThreshold = 10; // Plancher
          }
          break;
        case 'pressure':
          // Légère augmentation du risque
          riskProbability = 12 + (updateCounter % 5) + (history.progression * 0.5);
          if (riskProbability > 30) riskProbability = 30;
          
          futureValue = sensor.current_value * (1.02 + (history.progression * 0.002));
          timeToThreshold = null;
          break;
        case 'vibration':
          // Légère augmentation du risque
          riskProbability = 15 + (updateCounter % 4) + (history.progression * 0.7);
          if (riskProbability > 35) riskProbability = 35;
          
          futureValue = sensor.current_value * (1.03 + (history.progression * 0.003));
          timeToThreshold = null;
          break;
        default:
          break;
      }
    }
    
    // 3. MACHINE GAMMA - USÉE - DÉTÉRIORATION PROGRESSIVE DE PLUSIEURS CAPTEURS
    else if (machineId === 'machine-003') {
      switch(sensor.sensor_type) {
        case 'temperature':
          // Augmentation constante du risque
          riskProbability = 60 + (updateCounter * 1.5) + (history.progression * 1.8);
          if (riskProbability > 90) riskProbability = 90;
          
          futureValue = sensor.current_value * (1.15 + (history.progression * 0.01));
          
          if (history.progression > 1) {
            timeToThreshold = 15 - Math.floor(history.progression * 0.6);
            if (timeToThreshold < 5) timeToThreshold = 5;
          }
          break;
        case 'pressure':
          // Augmentation importante du risque
          riskProbability = 65 + (updateCounter * 1.8) + (history.progression * 2);
          if (riskProbability > 95) riskProbability = 95;
          
          futureValue = sensor.current_value * (1.2 + (history.progression * 0.012));
          
          if (history.progression > 1) {
            timeToThreshold = 18 - Math.floor(history.progression * 0.8);
            if (timeToThreshold < 6) timeToThreshold = 6;
          }
          break;
        case 'vibration':
          // Augmentation modérée du risque
          riskProbability = 30 + (updateCounter * 1.2) + (history.progression * 1.5);
          if (riskProbability > 75) riskProbability = 75;
          
          futureValue = sensor.current_value * (1.1 + (history.progression * 0.008));
          
          if (history.progression > 3) {
            timeToThreshold = 22 - Math.floor(history.progression * 0.7);
            if (timeToThreshold < 8) timeToThreshold = 8;
          } else {
            timeToThreshold = null;
          }
          break;
        default:
          break;
      }
    }
    
    // 4. MACHINE DELTA - CRITIQUE - DÉFAILLANCE RAPIDEMENT IMMINENTE
    else if (machineId === 'machine-004') {
      switch(sensor.sensor_type) {
        case 'temperature':
          // Risque critique en augmentation constante
          riskProbability = 85 + (updateCounter * 1) + (history.progression * 1.2);
          if (riskProbability > 99) riskProbability = 99;
          
          futureValue = sensor.current_value * (1.3 + (history.progression * 0.015));
          
          // Temps avant défaillance qui diminue rapidement
          timeToThreshold = 5 - Math.floor(history.progression * 0.5);
          if (timeToThreshold < 1) timeToThreshold = 1;
          break;
        case 'pressure':
          riskProbability = 90 + (updateCounter * 0.8) + (history.progression * 1);
          if (riskProbability > 99) riskProbability = 99;
          
          futureValue = sensor.current_value * (1.35 + (history.progression * 0.018));
          
          timeToThreshold = 3 - Math.floor(history.progression * 0.3);
          if (timeToThreshold < 1) timeToThreshold = 1;
          break;
        case 'vibration':
          riskProbability = 80 + (updateCounter * 1.2) + (history.progression * 1.5);
          if (riskProbability > 99) riskProbability = 99;
          
          futureValue = sensor.current_value * (1.25 + (history.progression * 0.014));
          
          timeToThreshold = 8 - Math.floor(history.progression * 0.6);
          if (timeToThreshold < 2) timeToThreshold = 2;
          break;
        default:
          break;
      }
    }
    
    // Mettre à jour l'historique pour cette machine/capteur
    const updatedHistory = {
      ...history,
      progression: history.progression + (updateCounter > 0 ? 0.5 : 0), // Incrémenter la progression
      previousValues: [...history.previousValues, sensor.current_value].slice(-5), // Garder les 5 dernières valeurs
    };
    
    // Mettre à jour le machineHistory avec cette nouvelle entrée
    setMachineHistory(prev => ({...prev, [sensorKey]: updatedHistory}));
    
    // Suggestions selon le niveau de risque
    let suggestions = [];
    if (riskProbability < 30) {
      suggestions.push('Aucune action nécessaire');
      suggestions.push('Maintenance préventive planifiée');
    } else if (riskProbability < 70) {
      suggestions.push('Vérifier les paramètres de fonctionnement');
      if (sensor.sensor_type === 'temperature') {
        suggestions.push('Contrôler le système de refroidissement');
      } else if (sensor.sensor_type === 'pressure') {
        suggestions.push('Vérifier les joints et les valves');
      } else {
        suggestions.push('Inspecter les pièces rotatives');
      }
    } else {
      suggestions.push('Intervention technique requise rapidement');
      if (sensor.sensor_type === 'temperature') {
        suggestions.push('Arrêt programmé pour remplacement du système thermique');
        suggestions.push('Réduire la charge de travail immédiatement');
      } else if (sensor.sensor_type === 'pressure') {
        suggestions.push('Contrôler l\'étanchéité du circuit principal');
        suggestions.push('Préparer le remplacement des joints défectueux');
      } else {
        suggestions.push('Inspection complète des roulements et alignement');
        suggestions.push('Envisager le remplacement des modules vibrants');
      }
    }
    
    // Message adapté au niveau de risque
    let message;
    if (riskProbability < 30) {
      message = `Fonctionnement normal du capteur ${sensor.sensor_type}`;
    } else if (riskProbability < 70) {
      message = `Surveillance recommandée: ${sensor.sensor_type} montre des signes d'usure`;
    } else if (riskProbability < 90) {
      message = `Risque élevé de défaillance du capteur ${sensor.sensor_type}`;
    } else {
      message = `ALERTE CRITIQUE: Défaillance imminente du ${sensor.sensor_type}`;
    }
    
    return {
      sensor_type: sensor.sensor_type,
      current_value: sensor.current_value,
      future_value: Math.round(futureValue * 100) / 100,
      time_to_threshold: timeToThreshold,
      risk_probability: Math.round(riskProbability),
      prediction: message,
      suggestions: suggestions,
      will_have_issue: riskProbability > 50 && timeToThreshold !== null,
      machineId: machineId
    };
  };

  // Fonction pour analyser et pru00e9dire les anomalies sur 30 minutes
  const analyzeFuture = async () => {
    setLoading(true);
    setError(null);

    try {
      // Vu00e9rifier d'abord s'il y a des machines actives
      if (machines.length === 0) {
        setPredictions({});
        setLastUpdateTime(new Date().toLocaleTimeString('fr-FR'));
        setLoading(false);
        return;
      }
      
      // Incrémenter le compteur d'actualisations
      setUpdateCounter(prev => prev + 1);
      
      console.log("Actualisation #", updateCounter + 1);
      
      // Ru00e9cupu00e9rer les donnu00e9es des capteurs pour toutes les machines actives
      const machineData = {};
      
      // Pour chaque machine active, genu00e9rer des pru00e9dictions intelligentes
      for (const machine of machines) {
        try {
          // LOGIQUE DE PRu00c9DICTION INTELLIGENTE POUR DÉMONSTRATION
          // Obtenir l'u00e2ge de la machine pour influencer les pru00e9dictions
          const machineAge = getMachineAge(machine.machine_id);
          
          // Pour la démonstration, utilisons des valeurs de capteurs fixes et logiques
          // qui correspondent à l'âge et à l'état de la machine
          
          // Capteur de tempu00e9rature
          const temperatureSensor = {
            sensor_type: 'temperature',
            machineId: machine.machine_id,
            current_value: 65 + machineAge * 2,  // Température augmente avec l'âge
            baseline: 70,
            critical_threshold: 95,
            trend_factor: 0.15,
            time_factor: 20
          };
          
          // Capteur de pression
          const pressureSensor = {
            sensor_type: 'pressure',
            machineId: machine.machine_id,
            current_value: 2.5 + (machineAge * 0.1),  // Pression augmente légèrement avec l'âge
            baseline: 3,
            critical_threshold: 6,
            trend_factor: 0.1,
            time_factor: 15
          };
          
          // Capteur de vibration
          const vibrationSensor = {
            sensor_type: 'vibration',
            machineId: machine.machine_id,
            current_value: 8 + (machineAge * 0.6),  // Vibration augmente avec l'âge
            baseline: 12,
            critical_threshold: 25,
            trend_factor: 0.08,
            time_factor: 12
          };
          
          // Application du modèle de pru00e9diction pour chaque capteur
          const sensors = [temperatureSensor, pressureSensor, vibrationSensor].map(sensor => {
            // Calculer la pru00e9diction pour ce capteur
            const prediction = predictSensorTrend(sensor, machineAge);
            return prediction;
          });
          
          // Analyse globale des problèmes potentiels
          const hasFutureIssues = sensors.some(sensor => sensor.will_have_issue);
          
          // Trouver le problème le plus imminent
          const soonestIssue = hasFutureIssues 
            ? Math.min(...sensors.filter(s => s.will_have_issue).map(s => s.time_to_threshold || 999))
            : null;
          
          // Construire le message de pru00e9diction
          const message = hasFutureIssues 
            ? `Problème pru00e9vu dans ${soonestIssue} minutes` 
            : "Aucun problème pru00e9vu dans les 30 prochaines minutes";
          
          // Enregistrer les donnu00e9es pour cette machine
          machineData[machine.machine_id] = {
            machine_name: machine.name || `Machine ${machine.machine_id}`,
            machine_status: machine.status,
            sensors: sensors,
            has_future_issues: hasFutureIssues,
            soonest_issue: soonestIssue,
            message: message
          };
        } catch (machineError) {
          console.error(`Erreur lors de l'analyse de la machine ${machine.machine_id}:`, machineError);
        }
      }
      
      setPredictions(machineData);
      setLastUpdateTime(new Date().toLocaleTimeString('fr-FR'));
      
    } catch (error) {
      console.error("Erreur lors de l'analyse future:", error);
      setError(`Erreur de chargement des pru00e9dictions: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Fonction d'aide pour obtenir un u00e2ge virtuel de la machine (simuleu00e9)
  const getMachineAge = (machineId) => {
    // Pour la démonstration, utilisons des valeurs fixes et logiques
    const machineInfo = {
      'machine-001': { age: 1, condition: 'Neuve' },       // Machine Alpha - Neuve
      'machine-002': { age: 5, condition: 'Normale' },     // Machine Beta - Utilisation normale
      'machine-003': { age: 7, condition: 'Usée' },        // Machine Gamma - Début de dégradation
      'machine-004': { age: 10, condition: 'Critique' }    // Machine Delta - Fin de vie
    };
    
    if (machineInfo[machineId]) {
      return machineInfo[machineId].age;
    }
    return 5; // Valeur par défaut
  };
  
  // Fonction pour formater la valeur avec l'unitu00e9 appropriu00e9e
  const formatValue = (value, type) => {
    if (type === 'temperature') return `${value.toFixed(1)}°C`;
    if (type === 'pressure') return `${value.toFixed(1)} bar`;
    if (type === 'vibration') return `${value.toFixed(2)} Hz`;
    return value;
  };

  // Donne la couleur correspondant au niveau de risque
  const getRiskColor = (risk) => {
    if (risk >= 80) return 'error';
    if (risk >= 60) return 'warning';
    if (risk >= 40) return 'info';
    return 'success';
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="div">
            <TimelapseIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Pru00e9dictions sur 30 minutes
            {lastUpdateTime && <Typography variant="caption" sx={{ ml: 1 }}>(Derniu00e8re mise u00e0 jour: {lastUpdateTime})</Typography>}
          </Typography>

          <Button
            variant="contained"
            color="primary"
            onClick={analyzeFuture}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <TimelapseIcon />}
          >
            Actualiser
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" m={3}>
            <CircularProgress />
          </Box>
        ) : predictions ? (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Analyse des tendances pour du00e9tecter les potentielles anomalies dans les 30 prochaines minutes.
            </Typography>

            {Object.entries(predictions).length === 0 ? (
              <Alert severity="info">Aucune machine disponible pour l'analyse.</Alert>
            ) : (
              Object.entries(predictions).map(([machineId, data]) => (
                <Accordion key={machineId} sx={{ mt: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" width="100%">
                      <Typography sx={{ flexGrow: 1 }}>
                        <strong>{data.machine_name}</strong> ({machineId})
                      </Typography>

                      {data.has_future_issues ? (
                        <Chip
                          icon={<WarningIcon />}
                          label={data.soonest_issue === 0 ? 
                            "Risque critique immédiat" : 
                            `Risque dans ${data.soonest_issue || '?'} min.`}
                          color={data.soonest_issue === 0 ? "error" : "warning"}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      ) : (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="Aucun risque"
                          color="success"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                  </AccordionSummary>

                  <AccordionDetails>
                    <Alert
                      severity={data.has_future_issues ? "warning" : "success"}
                      sx={{ mb: 2 }}
                    >
                      {data.message}
                    </Alert>

                    <List dense>
                      {data.sensors.map((sensor, index) => (
                        <React.Fragment key={`${machineId}-${sensor.sensor_type}-${index}`}>
                          {index > 0 && <Divider component="li" />}
                          <ListItem>
                            <ListItemText
                              primary={<>
                                <strong>{sensor.sensor_type}</strong> -
                                <Chip
                                  label={`${sensor.risk_probability.toFixed(0)}%`}
                                  size="small"
                                  color={getRiskColor(sensor.risk_probability)}
                                  sx={{ ml: 1 }}
                                />
                              </>}
                              secondary={<>
                                Valeur actuelle: {formatValue(sensor.current_value, sensor.sensor_type)}<br />
                                {sensor.will_have_issue ? (
                                  <>
                                    <Typography component="span" color="error" variant="body2">
                                      {sensor.prediction}
                                    </Typography><br />
                                    {sensor.time_to_threshold ? (
                                      `Estimu00e9 dans: ${sensor.time_to_threshold} minutes`
                                    ) : "Temps indéterminé"}
                                  </>
                                ) : "Aucune anomalie pru00e9vue pour ce capteur"}
                              </>}
                            />
                          </ListItem>
                        </React.Fragment>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </Box>
        ) : (
          <Alert severity="info">
            Cliquez sur "Analyser" pour tu00e9lu00e9charger les pru00e9dictions d'anomalies pour les 30 prochaines minutes.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default FuturePredictions;

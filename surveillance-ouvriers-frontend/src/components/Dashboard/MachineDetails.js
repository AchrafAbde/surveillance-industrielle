import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  CircularProgress, 
  Alert,
  Paper,
  Divider,
  Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WarningIcon from '@mui/icons-material/Warning';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BuildIcon from '@mui/icons-material/Build';
import { useAuth } from '../../context/AuthContext';
import SensorChart from '../Sensors/SensorChart';
import api from '../../services/api';
import { io } from 'socket.io-client';

/**
 * MachineDetails component displays detailed information about a specific machine and its sensor data
 */
const MachineDetails = ({ onEmergencyStop, onActivate, onMaintenance }) => {
  const { machineId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [machine, setMachine] = useState(null);
  const [sensorData, setSensorData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Fetch machine details
  useEffect(() => {
    const fetchMachineDetails = async () => {
      setLoading(true);
      try {
        const data = await api.machines.getById(machineId);
        setMachine(data);
      } catch (error) {
        console.error('Error fetching machine details:', error);
        setError(error.message || 'Failed to fetch machine details');
      } finally {
        setLoading(false);
      }
    };

    if (machineId && token) {
      fetchMachineDetails();
    }
  }, [machineId, token]);

  // Connecter au websocket et s'abonner aux mises à jour de la machine
  useEffect(() => {
    // Initialiser la connexion socket
    const socketInstance = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');
    setSocket(socketInstance);
    
    // S'abonner à la machine spécifique
    socketInstance.on('connect', () => {
      console.log('Socket connected');
      socketInstance.emit('subscribe', { machine_id: machineId });
    });
    
    // Écouter les mises à jour du capteur
    socketInstance.on('sensor_update', (data) => {
      if (data.machine_id === machineId) {
        console.log('Received sensor update:', data);
        // Mettre à jour les données du capteur
        setSensorData(prev => {
          const newData = { ...prev };
          const sensorType = data.sensor_type;
          
          if (!newData[sensorType]) {
            newData[sensorType] = [];
          }
          
          // Ajouter la nouvelle donnée au début du tableau
          newData[sensorType] = [
            {
              sensor_id: data.sensor_id || 0,
              value: data.value,
              timestamp: data.timestamp,
              sensor_type: sensorType,
              machine_id: machineId
            },
            ...newData[sensorType].slice(0, 49) // Garder les 50 dernières valeurs
          ];
          
          return newData;
        });
        
        // Mettre à jour l'horodatage de la dernière mise à jour
        setLastUpdate(new Date());
      }
    });
    
    // Nettoyer la connexion socket lors du démontage
    return () => {
      if (socketInstance) {
        socketInstance.off('sensor_update');
        socketInstance.emit('unsubscribe', { machine_id: machineId });
        socketInstance.disconnect();
      }
    };
  }, [machineId]);

  // Function to get status color
  const getStatusColor = (status) => {
    switch(status) {
      case 'active':
        return 'success';
      case 'maintenance':
        return 'warning';
      case 'emergency_stop':
        return 'error';
      default:
        return 'default';
    }
  };

  // Function to get display text for status
  const getStatusDisplay = (status) => {
    switch(status) {
      case 'active':
        return 'Actif';
      case 'maintenance':
        return 'Maintenance';
      case 'emergency_stop':
        return 'Arrêt d\'urgence';
      default:
        return 'Inconnu';
    }
  };
  
  // Handle the back button click
  const handleBack = () => {
    navigate('/dashboard');
  };

  // Handle emergency stop button click
  const handleEmergencyStop = () => {
    if (onEmergencyStop && machineId) {
      console.log(`MachineDetails: Déclenchement arrêt d'urgence pour ${machineId}`);
      onEmergencyStop(machineId);
      
      // Mettre à jour l'état local de la machine
      setMachine(prevMachine => ({
        ...prevMachine,
        status: 'emergency_stop'
      }));
    }
  };

  // Handle activate machine button click
  const handleActivate = () => {
    if (onActivate && machineId) {
      console.log(`MachineDetails: Activation de la machine ${machineId}`);
      onActivate(machineId);
      
      // Mettre à jour l'état local de la machine
      setMachine(prevMachine => ({
        ...prevMachine,
        status: 'active'
      }));
    }
  };

  // Handle maintenance mode button click
  const handleMaintenance = () => {
    if (onMaintenance && machineId) {
      console.log(`MachineDetails: Mise en maintenance de la machine ${machineId}`);
      onMaintenance(machineId);
      
      // Mettre à jour l'état local de la machine
      setMachine(prevMachine => ({
        ...prevMachine,
        status: 'maintenance'
      }));
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ my: 2 }}>
        <Alert severity="error">{error}</Alert>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
          sx={{ mt: 2 }}
        >
          Retour au tableau de bord
        </Button>
      </Box>
    );
  }

  if (!machine) {
    return (
      <Box sx={{ my: 2 }}>
        <Alert severity="warning">Machine non trouvée</Alert>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
          sx={{ mt: 2 }}
        >
          Retour au tableau de bord
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
        >
          Retour
        </Button>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 3 }}>
          {/* Bouton d'arrêt d'urgence - visible seulement si la machine n'est pas déjà en arrêt d'urgence */}
          {machine && machine.status !== 'emergency_stop' && (
            <Button
              variant="contained"
              size="large"
              color="error"
              startIcon={<WarningIcon />}
              onClick={handleEmergencyStop}
              sx={{ py: 1.5, fontSize: '1.1rem', fontWeight: 'bold' }}
            >
              ARRÊT D'URGENCE
            </Button>
          )}
          
          {/* Bouton d'activation - visible seulement si la machine est en arrêt d'urgence ou en maintenance */}
          {machine && (machine.status === 'emergency_stop' || machine.status === 'maintenance') && (
            <Button
              variant="contained"
              size="large"
              color="success"
              startIcon={<PlayArrowIcon />}
              onClick={handleActivate}
              sx={{ py: 1.5, fontSize: '1.1rem', fontWeight: 'bold' }}
            >
              ACTIVER
            </Button>
          )}
          
          {/* Bouton de maintenance - visible seulement si la machine est active */}
          {machine && machine.status === 'active' && (
            <Button
              variant="contained"
              size="large"
              color="warning"
              startIcon={<BuildIcon />}
              onClick={handleMaintenance}
              sx={{ py: 1.5, fontSize: '1.1rem', fontWeight: 'bold' }}
            >
              MAINTENANCE
            </Button>
          )}
        </Box>
      </Box>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          {machine.name}
        </Typography>
        
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              ID Machine
            </Typography>
            <Typography variant="body1" gutterBottom>
              {machine.machine_id}
            </Typography>
            
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
              Type
            </Typography>
            <Typography variant="body1" gutterBottom>
              {machine.type}
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Emplacement
            </Typography>
            <Typography variant="body1" gutterBottom>
              {machine.location}
            </Typography>
            
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
              Statut
            </Typography>
            <Chip 
              label={getStatusDisplay(machine.status)} 
              color={getStatusColor(machine.status)} 
              size="small" 
            />
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="subtitle1" gutterBottom>
          Capteurs installés
        </Typography>
        <Box>
          {machine.sensors && machine.sensors.map((sensor, index) => (
            <Chip 
              key={index}
              label={sensor}
              sx={{ mr: 1, mb: 1 }}
              variant="outlined"
            />
          ))}
        </Box>
      </Paper>
      
      <Typography variant="h6" gutterBottom>
        Données des capteurs en temps réel
      </Typography>
      
      <Grid container spacing={3}>
        {machine.sensors && machine.sensors.map((sensorType) => (
          <Grid item xs={12} md={6} lg={4} key={sensorType}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  {sensorType.charAt(0).toUpperCase() + sensorType.slice(1).replace('_', ' ')}
                </Typography>
                {sensorData[sensorType] ? (
                  <SensorChart 
                    data={sensorData[sensorType]} 
                    sensorType={sensorType} 
                  />
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress size={30} />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'right' }}>
        Dernière mise à jour: {lastUpdate.toLocaleTimeString()}
      </Typography>
    </Box>
  );
};

export default MachineDetails;

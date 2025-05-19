import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Box, Typography, Grid, Card, CardContent, Alert, CircularProgress } from '@mui/material';
import MachineList from '../components/Dashboard/MachineList';
import AlertsPanel from '../components/Alerts/AlertsPanel';
import MachineDetails from '../components/Dashboard/MachineDetails';
import UsersManagement from './UsersManagement';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../context/AlertsContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';

function Dashboard() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const { user, token } = useAuth();
  const { getActiveAlerts, fetchAlerts, addAlert, deleteAlertsByMachineId } = useAlerts();
  const { connected } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMachines = async () => {
      setLoading(true);
      try {
        const data = await api.machines.getAll();
        setMachines(data);
      } catch (error) {
        console.error('Error fetching machines:', error);
        setError(error.message || 'Failed to fetch machines');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchMachines();
    }
  }, [token]);

  const handleEmergencyStop = async (machineId) => {
    try {
      console.log(`Déclenchement arrêt d'urgence pour ${machineId}`);
      
      // Trouver la machine pour avoir son nom
      const targetMachine = machines.find(m => m.machine_id === machineId);
      const machineName = targetMachine ? targetMachine.name : `Machine ${machineId}`;
      
      // Appeler l'API d'arrêt d'urgence
      await api.machines.emergencyStop(machineId);
      
      // Mettre à jour la machine localement
      setMachines(prev => 
        prev.map(machine => 
          machine.machine_id === machineId 
            ? { ...machine, status: 'emergency_stop' } 
            : machine
        )
      );
      
      // Créer une alerte d'arrêt d'urgence
      if (addAlert) {
        const now = new Date();
        
        // Créer une alerte d'urgence claire
        const emergencyAlert = {
          _id: `emergency-${machineId}-${Date.now()}`,
          machine_id: machineId,
          message: `ARRÊT D'URGENCE: Machine ${machineName}`,
          sensor_type: 'system',
          risk_level: 100,
          status: 'active',
          timestamp: now.toISOString(),
          suggestions: "Contacter immédiatement l'équipe de maintenance"
        };
        
        console.log("Création d'une alerte d'urgence:", emergencyAlert);
        addAlert(emergencyAlert);
      }
      
      // Afficher un message de confirmation
      setSuccess(`Arrêt d'urgence activé pour ${machineName}`);
      setTimeout(() => setSuccess(null), 5000);
      
    } catch (error) {
      console.error('Erreur lors de l\'arrêt d\'urgence:', error);
      setError(`Échec de l'arrêt d'urgence: ${error.message || 'Erreur inconnue'}`);
    }
  };

  // Fonction pour activer une machine (la rendre active)
  const handleActivateMachine = async (machineId) => {
    try {
      // Appeler l'API d'activation
      await api.machines.activateMachine(machineId);
      
      // Trouver la machine pour avoir son nom
      const targetMachine = machines.find(m => m.machine_id === machineId);
      const machineName = targetMachine ? targetMachine.name : `Machine ${machineId}`;
      
      // Mettre à jour la machine localement
      setMachines(prev => 
        prev.map(machine => 
          machine.machine_id === machineId 
            ? { ...machine, status: 'active' } 
            : machine
        )
      );
      
      // NOUVEAU: Supprimer les alertes associées à cette machine
      if (deleteAlertsByMachineId) {
        deleteAlertsByMachineId(machineId);
        console.log(`Alertes pour la machine ${machineId} supprimées suite à l'activation`);
      }
      
      // Afficher un message de confirmation
      setSuccess(`Machine ${machineName} activée avec succès`);
      setTimeout(() => setSuccess(null), 5000);
      
    } catch (error) {
      console.error('Erreur lors de l\'activation de la machine:', error);
      setError(`Échec de l'activation: ${error.message || 'Erreur inconnue'}`);
    }
  };

  // Fonction pour mettre une machine en maintenance
  const handleMaintenanceMode = async (machineId) => {
    try {
      // Appeler l'API de mise en maintenance
      await api.machines.setMaintenanceMode(machineId);
      
      // Mettre à jour la machine localement
      setMachines(prev => 
        prev.map(machine => 
          machine.machine_id === machineId 
            ? { ...machine, status: 'maintenance' } 
            : machine
        )
      );
      
      // Afficher un message de confirmation
      setSuccess(`Machine ${machineId} mise en maintenance`);
      setTimeout(() => setSuccess(null), 5000);
      
    } catch (error) {
      console.error('Erreur lors de la mise en maintenance:', error);
      setError(`Échec de la mise en maintenance: ${error.message || 'Erreur inconnue'}`);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Connection status */}
      {!connected && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Connexion au serveur perdue. Tentative de reconnexion...
        </Alert>
      )}
      
      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {/* Success message */}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Système de Surveillance Industrielle
        </Typography>
        {user && (
          <Typography variant="subtitle1">
            {user.name} ({user.role})
          </Typography>
        )}
      </Box>
      
      <Routes>
        <Route path="/" element={
          <Grid container spacing={3}>
            {/* Machines overview */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Machines
                  </Typography>
                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <MachineList 
                      machines={machines} 
                      onSelect={(machineId) => navigate(`/dashboard/machine/${machineId}`)}
                      onEmergencyStop={handleEmergencyStop}
                      onActivate={handleActivateMachine}
                      onMaintenance={handleMaintenanceMode}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* Active alerts */}
            <Grid item xs={12} md={4}>
              <AlertsPanel alerts={getActiveAlerts()} fetchAlerts={fetchAlerts} />
            </Grid>
          </Grid>
        } />
        
        <Route path="/machine/:machineId" element={
          <MachineDetails 
            onEmergencyStop={handleEmergencyStop} 
            onActivate={handleActivateMachine}
            onMaintenance={handleMaintenanceMode}
          />
        } />
        
        {/* Route pour la gestion des utilisateurs (admin seulement) */}
        <Route path="/users" element={
          <UsersManagement />
        } />
      </Routes>
    </Box>
  );
}

export default Dashboard;
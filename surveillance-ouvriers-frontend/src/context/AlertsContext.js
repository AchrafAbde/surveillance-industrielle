import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const AlertsContext = createContext();

export const useAlerts = () => useContext(AlertsContext);

export const AlertsProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { token, isAuthenticated, user } = useAuth();
  const { subscribe } = useSocket();
  
  // Définition des fonctions avant leur utilisation dans useEffect
  const fetchAlerts = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('AlertsContext: Chargement des alertes...');
      const data = await api.alerts.getAll();
      console.log('AlertsContext: Alertes reçues:', data);
      if (Array.isArray(data)) {
        setAlerts(data);
      } else {
        console.error('Format invalide de données d\'alertes:', data);
        setAlerts([]);
      }
    } catch (error) {
      console.error('Échec du chargement des alertes:', error);
      setError('Échec du chargement des alertes');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const resolveAlert = async (alertId) => {
    if (!token) return;
    
    try {
      console.log(`Suppression de l'alerte: ${alertId}`);
      
      // Mettre à jour le backend
      await api.alerts.resolve(alertId);
      
      // MODIFICATION: SUPPRIMER l'alerte au lieu de la marquer comme résolue
      setAlerts(prevAlerts => prevAlerts.filter(alert => alert._id !== alertId));
      
      return true;
    } catch (error) {
      console.error('Échec de suppression de l\'alerte:', error);
      return false;
    }
  };

  // Fonction pour ajouter une nouvelle alerte manuellement
  const addAlert = useCallback((newAlert) => {
    console.log('Ajout manuel d\'une alerte:', newAlert);
    setAlerts(prev => [newAlert, ...prev]);
  }, []);

  // Fonction pour supprimer toutes les alertes associées à une machine
  const deleteAlertsByMachineId = useCallback((machineId) => {
    console.log(`Suppression des alertes pour la machine: ${machineId}`);
    
    // Supprimer TOUTES les alertes de cette machine sans exception
    setAlerts(prevAlerts => prevAlerts.filter(alert => 
      alert.machine_id !== machineId
    ));
    
    return true;
  }, []);

  // Subscribe to new alerts via Socket.IO
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    
    // Subscribe to new alert event
    const unsubscribeNewAlert = subscribe('new_alert', (alert) => {
      console.log('New alert received:', alert);
      setAlerts(prevAlerts => [alert, ...prevAlerts]);
    });
    
    // Subscribe to alert resolved event
    const unsubscribeResolvedAlert = subscribe('alert_resolved', ({ alert_id, resolved_by }) => {
      console.log('Alert resolved:', alert_id);
      
      // Update local state
      setAlerts(prevAlerts => 
        prevAlerts.map(alert => 
          alert._id === alert_id 
            ? { ...alert, status: 'resolved', resolved_by, resolved_at: new Date().toISOString() } 
            : alert
        )
      );
    });
    
    return () => {
      unsubscribeNewAlert && unsubscribeNewAlert();
      unsubscribeResolvedAlert && unsubscribeResolvedAlert();
    };
  }, [isAuthenticated, token, subscribe, fetchAlerts]);
  
  // Fetch alerts on mount and when token changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchAlerts();
    }
  }, [isAuthenticated, fetchAlerts]);
  
  const getActiveAlerts = () => {
    const active = alerts.filter(alert => alert.status === 'active');
    console.log('Alertes actives:', active);
    return active;
  };
  
  return (
    <AlertsContext.Provider value={{ 
      alerts, 
      loading, 
      error, 
      resolveAlert, 
      fetchAlerts,
      getActiveAlerts,
      addAlert,
      deleteAlertsByMachineId
    }}>
      {children}
    </AlertsContext.Provider>
  );
};

export default AlertsContext;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAlerts } from '../../context/AlertsContext';
import { useSocket } from '../../context/SocketContext';
import {
  Snackbar,
  Alert,
  Button,
  Typography,
  Box,
  IconButton,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WarningIcon from '@mui/icons-material/Warning';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import ErrorIcon from '@mui/icons-material/Error';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AssessmentIcon from '@mui/icons-material/Assessment';

/**
 * Composant qui affiche des notifications d'alerte en temps réel partout dans l'application
 */
const GlobalAlertNotification = () => {
  const { subscribe } = useSocket();
  const navigate = useNavigate();
  const [openAlert, setOpenAlert] = useState(false);
  const [currentAlert, setCurrentAlert] = useState(null);
  const [alertQueue, setAlertQueue] = useState([]);
  const [expanded, setExpanded] = useState(false);

  // S'abonner aux nouvelles alertes
  useEffect(() => {
    // S'abonner à l'événement 'new_alert'
    const unsubscribeNewAlert = subscribe('new_alert', (alert) => {
      console.log('Nouvelle alerte globale reçue:', alert);
      
      // Ajouter l'alerte à la file d'attente
      setAlertQueue(prevQueue => {
        // Prioriser les alertes de risque élevé
        const newQueue = [...prevQueue, alert].sort((a, b) => b.risk_level - a.risk_level);
        return newQueue;
      });
      
      // Si aucune alerte n'est affichée actuellement, afficher cette alerte
      if (!openAlert) {
        setCurrentAlert(alert);
        setOpenAlert(true);
      }
      
      // Toujours réinitialiser l'état étendu pour une nouvelle alerte
      setExpanded(false);
    });

    return () => {
      unsubscribeNewAlert && unsubscribeNewAlert();
    };
  }, [subscribe, openAlert]);

  // Gestion de la fermeture de l'alerte
  const handleCloseAlert = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }

    setOpenAlert(false);
    
    // Vérifier s'il y a d'autres alertes en attente
    setTimeout(() => {
      if (alertQueue.length > 1) {
        // Supprimer l'alerte actuelle de la file d'attente et afficher la suivante
        const newQueue = [...alertQueue];
        newQueue.shift();
        setAlertQueue(newQueue);
        setCurrentAlert(newQueue[0]);
        setExpanded(false); // Réinitialiser l'état étendu
        setOpenAlert(true);
      } else {
        // Vider la file d'attente
        setAlertQueue([]);
        setCurrentAlert(null);
      }
    }, 300);
  };

  // Naviguer vers la page des alertes
  const goToAlerts = () => {
    navigate('/dashboard/alerts');
    handleCloseAlert();
  };

  // Basculer l'affichage des détails
  const toggleDetails = () => {
    setExpanded(!expanded);
  };

  // Si aucune alerte, ne rien afficher
  if (!currentAlert) return null;

  // Formatage du message d'alerte
  const getMachineInfo = () => `Machine ${currentAlert.machine_id}`;
  
  const getSensorInfo = () => {
    let icon = '';
    switch(currentAlert.sensor_type) {
      case 'temperature':
        icon = '🌡️';
        break;
      case 'pressure':
        icon = '⚖️';
        break;
      case 'vibration':
        icon = '📳';
        break;
      default:
        icon = '📊';
    }
    return `${icon} ${currentAlert.sensor_type}: ${currentAlert.value}`;
  };
  
  const getRiskLevel = () => {
    const risk = currentAlert.risk_level || 0;
    let color = 'info';
    let label = 'Information';
    
    if (risk >= 90) {
      color = 'error';
      label = 'Critique';
    } else if (risk >= 70) {
      color = 'warning';
      label = 'Élevé';
    } else if (risk >= 50) {
      color = 'warning';
      label = 'Moyen';
    }
    
    return (
      <Chip 
        label={`${label} (${risk}%)`}
        color={color}
        size="small"
        icon={risk >= 70 ? <ErrorIcon /> : <WarningIcon />}
        sx={{ fontWeight: 'bold' }}
      />
    );
  };
  
  // Déterminer la couleur de l'alerte en fonction du niveau de risque
  const getAlertSeverity = () => {
    const risk = currentAlert.risk_level || 0;
    if (risk >= 90) return "error";
    if (risk >= 70) return "warning";
    if (risk >= 50) return "info";
    return "info";
  };

  return (
    <Snackbar
      open={openAlert}
      autoHideDuration={expanded ? null : 12000} // Pas de fermeture auto si détails affichés
      onClose={handleCloseAlert}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert
        severity={getAlertSeverity()}
        variant="filled"
        icon={<NotificationsActiveIcon />}
        sx={{
          width: '100%',
          maxWidth: expanded ? 450 : 400,
          transition: 'max-width 0.3s ease',
          '& .MuiAlert-message': {
            width: '100%'
          }
        }}
        action={
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={handleCloseAlert}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      >
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center' }}>
            <WarningIcon sx={{ mr: 1 }} />
            Alerte: {getMachineInfo()}
          </Typography>
        </Box>
        
        <Typography variant="body2" sx={{ mb: 1 }}>
          {getSensorInfo()}
        </Typography>
        
        <Typography variant="body1" fontWeight="medium" sx={{ mb: 1 }}>
          {currentAlert.message || "Anomalie détectée"}
        </Typography>
        
        {expanded && currentAlert.suggestions && currentAlert.suggestions.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="body2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <TipsAndUpdatesIcon fontSize="small" sx={{ mr: 0.5 }} />
              Suggestions:
            </Typography>
            <List dense disablePadding>
              {currentAlert.suggestions.map((suggestion, index) => (
                <ListItem key={index} disablePadding sx={{ pl: 2 }}>
                  <ListItemIcon sx={{ minWidth: 24 }}>•</ListItemIcon>
                  <ListItemText primary={suggestion} primaryTypographyProps={{ variant: 'body2' }} />
                </ListItem>
              ))}
            </List>
          </>
        )}
        
        {currentAlert.time_to_threshold && expanded && (
          <>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AccessTimeIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="body2">
                Temps estimé avant seuil critique: {currentAlert.time_to_threshold} minutes
              </Typography>
            </Box>
          </>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          {getRiskLevel()}
          <Box>
            <Button 
              size="small" 
              variant="text" 
              onClick={toggleDetails}
              sx={{ mr: 1 }}
            >
              {expanded ? "Moins" : "Plus"}
            </Button>
            <Button 
              size="small" 
              variant="contained" 
              color={getAlertSeverity()}
              startIcon={<AssessmentIcon />}
              onClick={goToAlerts}
            >
              Détails
            </Button>
          </Box>
        </Box>
      </Alert>
    </Snackbar>
  );
};

export default GlobalAlertNotification;

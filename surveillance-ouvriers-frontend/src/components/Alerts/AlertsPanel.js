import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  Button, 
  Divider, 
  Box, 
  Chip,
  Tabs,
  Tab,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import TimelapseIcon from '@mui/icons-material/Timelapse';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAlerts } from '../../context/AlertsContext';
import api from '../../services/api';
import FuturePredictions from './FuturePredictions';

/**
 * AlertsPanel component displays the current active alerts and their history,
 * providing functionality to resolve and filter them
 */
const AlertsPanel = ({ alerts, fetchAlerts }) => {
  const { resolveAlert, deleteAlert } = useAlerts();
  const [tabValue, setTabValue] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, alertId: null });
  const [machines, setMachines] = useState([]);

  // Log pour débogage
  console.log('Alertes reçues dans AlertsPanel:', alerts);

  // Charger les machines au montage
  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const data = await api.machines.getAll();
        setMachines(data);
      } catch (error) {
        console.error('Erreur lors de la récupération des machines:', error);
      }
    };
    
    fetchMachines();
  }, []);

  // Gestion du changement d'onglet sans actualisation
  const handleTabChange = (event, newValue) => {
    // Simplement changer l'onglet sans rafraîchir les données
    setTabValue(newValue);
    // Ne pas appeler fetchAlerts() ici pour éviter la perte des alertes
  };

  const handleResolve = async (alertId) => {
    try {
      console.log(`AlertPanel: Demande de résolution/suppression de l'alerte ${alertId}`);
      
      // Appeler resolveAlert du contexte
      const success = await resolveAlert(alertId);
      
      if (success) {
        console.log(`Alerte ${alertId} supprimée avec succès`);
        
        // Rafraîchir les alertes pour s'assurer que la liste est à jour
        if (fetchAlerts) {
          console.log('Rafraîchissement des alertes après suppression');
          fetchAlerts();
        }
      } else {
        console.error(`Échec de la suppression de l'alerte ${alertId}`);
      }
    } catch (error) {
      console.error('Échec de résolution de l\'alerte:', error);
    }
  };
  
  const handleDeleteConfirm = (alertId) => {
    setConfirmDialog({ open: true, alertId });
  };
  
  const handleDelete = async () => {
    try {
      if (confirmDialog.alertId) {
        await deleteAlert(confirmDialog.alertId);
      }
    } catch (error) {
      console.error('Failed to delete alert:', error);
    } finally {
      setConfirmDialog({ open: false, alertId: null });
    }
  };

  // Format timestamp to readable date and time
  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return format(date, 'dd/MM/yyyy HH:mm', { locale: fr });
    } catch (error) {
      return 'Date inconnue';
    }
  };

  // Obtenir les alertes actives - uniquement celles d'arrêt d'urgence
  const activeAlerts = alerts.filter(alert => 
    alert.status === 'active' && 
    alert.message && alert.message.includes('ARRÊT D\'URGENCE')
  );
  console.log('Alertes actives filtrées:', activeAlerts);

  // Fonction pour obtenir le niveau de risque sous forme de texte
  const getRiskLevelText = (riskLevel) => {
    if (riskLevel >= 90) return 'Critique';
    if (riskLevel >= 70) return 'Élevé';
    if (riskLevel >= 40) return 'Moyen';
    return 'Faible';
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>
            Système d'alertes
          </Typography>
          <Badge 
            badgeContent={activeAlerts.length} 
            color="error"
            showZero
            max={99}
          >
            <NotificationsActiveIcon />
          </Badge>
        </Box>
        
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          sx={{ mb: 2 }}
        >
          <Tab 
            icon={<WarningIcon />} 
            iconPosition="start" 
            label={`Alertes actives (${activeAlerts.length})`} 
            id="tab-0"
          />
          <Tab 
            icon={<TimelapseIcon />} 
            iconPosition="start" 
            label="Prédictions" 
            id="tab-1"
          />
        </Tabs>
        
        <div role="tabpanel" hidden={tabValue !== 0}>
          {tabValue === 0 && (
            <>
              {activeAlerts.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CheckCircleIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography>Aucune alerte active pour le moment</Typography>
                </Box>
              ) : (
                <Box>
                  {/* En-tête du tableau */}
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: '2fr 2fr 1fr 1fr',
                    bgcolor: 'primary.main',
                    color: 'white',
                    p: 1,
                    fontWeight: 'bold',
                    borderRadius: '4px 4px 0 0'
                  }}>
                    <Typography variant="subtitle2">Machine</Typography>
                    <Typography variant="subtitle2">Type d'Alerte</Typography>
                    <Typography variant="subtitle2">Heure</Typography>
                    <Typography variant="subtitle2">Statut</Typography>
                  </Box>
                  
                  {/* Liste des alertes */}
                  <List sx={{ width: '100%', bgcolor: 'background.paper', p: 0 }}>
                    {activeAlerts.map((alert, index) => {
                      // Trouver le nom de la machine correspondante
                      const machine = machines.find(m => m.machine_id === alert.machine_id);
                      const machineName = machine ? machine.name : `Machine ${alert.machine_id}`;
                      
                      return (
                        <React.Fragment key={alert._id}>
                          <ListItem 
                            alignItems="center"
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: '2fr 2fr 1fr 1fr',
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                              py: 1
                            }}
                          >
                            {/* Colonne Machine */}
                            <Typography variant="body2" fontWeight="medium">
                              {machineName}
                            </Typography>
                            
                            {/* Colonne Type d'Alerte */}
                            <Typography variant="body2">
                              Arrêt d'urgence
                            </Typography>
                            
                            {/* Colonne Heure */}
                            <Typography variant="body2">
                              {formatTimestamp(alert.timestamp).split(' ')[1]}
                            </Typography>
                            
                            {/* Colonne Statut */}
                            <Box>
                              <Chip 
                                label={getRiskLevelText(alert.risk_level)}
                                size="small"
                                color={alert.risk_level >= 70 ? "error" : 
                                      alert.risk_level >= 40 ? "warning" : "info"}
                              />
                            </Box>
                          </ListItem>
                          
                          {/* Afficher les détails de l'alerte dans une section expandable */}
                          <Accordion sx={{ boxShadow: 'none', m: 0 }}>
                            <AccordionSummary 
                              expandIcon={<ExpandMoreIcon />}
                              sx={{ bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}
                            >
                              <Typography variant="body2">Voir détails et suggestions</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Typography variant="body2" paragraph>
                                {alert.message}
                              </Typography>
                            </AccordionDetails>
                          </Accordion>
                        </React.Fragment>
                      );
                    })}
                  </List>
                </Box>
              )}
            </>
          )}
        </div>
        
        {/* Nouvel onglet Prédictions */}
        {tabValue === 1 && (
          <FuturePredictions />
        )}
        
        {/* Dialogue de confirmation de suppression */}
        <Dialog
          open={confirmDialog.open}
          onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        >
          <DialogTitle>Confirmer la suppression</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Êtes-vous sûr de vouloir supprimer définitivement cette alerte de l'historique ? Cette action est irréversible.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
              Annuler
            </Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              Supprimer
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AlertsPanel;

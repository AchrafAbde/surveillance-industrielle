import React, { useState } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Avatar,
  Stack
} from '@mui/material';
import TimerIcon from '@mui/icons-material/Timer';
import AssistantIcon from '@mui/icons-material/Assistant';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import BreakfastDiningIcon from '@mui/icons-material/BreakfastDining';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import api from '../../services/api';

/**
 * PredictionPanel component to display machine predictions and intelligent suggestions
 */
const PredictionPanel = ({ predictions, loading, error, machineId }) => {
  const [openPauseDialog, setOpenPauseDialog] = useState(false);
  const [pauseDuration, setPauseDuration] = useState(15);
  const [pauseRiskAnalysis, setPauseRiskAnalysis] = useState(null);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [technicians, setTechnicians] = useState([
    { id: 1, name: "Thomas Martin", status: "active" },
    { id: 2, name: "Sophie Dubois", status: "break" }
  ]);

  const handlePauseRequest = async () => {
    setPauseLoading(true);
    try {
      // Analyser si une pause est possible en fonction des prédictions actuelles
      const analysis = await api.workers.analyzePauseRisk(machineId, pauseDuration);
      setPauseRiskAnalysis(analysis);
    } catch (error) {
      console.error('Erreur lors de l\'analyse des risques de pause:', error);
    } finally {
      setPauseLoading(false);
    }
  };

  const handleConfirmPause = async () => {
    try {
      await api.workers.requestPause(machineId, pauseDuration);
      // Mettre à jour le statut du technicien dans notre état local
      setTechnicians(prevTechnicians => 
        prevTechnicians.map(tech => 
          tech.id === 1 ? { ...tech, status: "break" } : tech
        )
      );
      setOpenPauseDialog(false);
    } catch (error) {
      console.error('Erreur lors de la demande de pause:', error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Erreur lors du chargement des prédictions: {error}
      </Alert>
    );
  }

  // Si pas de prédictions ou objet vide
  if (!predictions || Object.keys(predictions).length === 0) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Prédictions IA
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="body1">Aucune anomalie détectée</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Le système surveille en permanence les données des capteurs
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />
          
          {/* Section des techniciens */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              <PersonIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Techniciens affectés
            </Typography>
            
            <Stack direction="row" spacing={2} sx={{ mt: 1, mb: 2 }}>
              {technicians.map(tech => (
                <Chip
                  key={tech.id}
                  avatar={<Avatar>{tech.name.charAt(0)}</Avatar>}
                  label={tech.name}
                  color={tech.status === 'active' ? 'primary' : 'default'}
                  variant={tech.status === 'active' ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>
            
            <Button 
              variant="outlined" 
              startIcon={<BreakfastDiningIcon />} 
              size="small"
              onClick={() => setOpenPauseDialog(true)}
              disabled={technicians.find(t => t.id === 1)?.status === 'break'}
            >
              Demander une pause
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Obtenir les prédictions avec risque élevé (>80%)
  const highRiskPredictions = Object.entries(predictions).filter(
    ([_, data]) => data.risk_probability >= 80
  );

  // Obtenir toutes les suggestions uniques
  const allSuggestions = new Set();
  Object.values(predictions).forEach(data => {
    if (data.suggestions && Array.isArray(data.suggestions)) {
      data.suggestions.forEach(suggestion => allSuggestions.add(suggestion));
    }
  });

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Prédictions IA
        </Typography>

        {highRiskPredictions.length > 0 ? (
          <>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="error" gutterBottom>
                <WarningIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Risques détectés
              </Typography>
              
              <List dense>
                {highRiskPredictions.map(([sensorType, data]) => (
                  <ListItem key={sensorType} sx={{ bgcolor: 'error.light', borderRadius: 1, mb: 1 }}>
                    <ListItemIcon>
                      <TimerIcon color="error" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body1">
                          {data.prediction || `Problème sur capteur ${sensorType}`}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" component="span">
                            Probable dans {data.estimated_time || '15 minutes'}
                          </Typography>
                          <br />
                          <Chip 
                            size="small" 
                            color="error"
                            label={`Risque: ${Math.round(data.risk_probability)}%`}
                            sx={{ mt: 0.5 }}
                          />
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
            
            <Divider sx={{ my: 2 }} />
          </>
        ) : (
          <Box sx={{ mb: 2, p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
              <CheckCircleIcon color="success" sx={{ mr: 1 }} />
              Aucun risque élevé détecté actuellement
            </Typography>
          </Box>
        )}
        
        {allSuggestions.size > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              <AssistantIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Suggestions intelligentes
            </Typography>
            
            <List dense>
              {[...allSuggestions].map((suggestion, index) => (
                <ListItem key={index} sx={{ bgcolor: 'info.light', borderRadius: 1, mb: 0.5 }}>
                  <ListItemText primary={suggestion} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
        
        <Divider sx={{ my: 2 }} />
        
        {/* Section des techniciens */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            <PersonIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Techniciens affectés
          </Typography>
          
          <Stack direction="row" spacing={2} sx={{ mt: 1, mb: 2 }}>
            {technicians.map(tech => (
              <Chip
                key={tech.id}
                avatar={<Avatar>{tech.name.charAt(0)}</Avatar>}
                label={tech.name}
                color={tech.status === 'active' ? 'primary' : 'default'}
                variant={tech.status === 'active' ? 'filled' : 'outlined'}
              />
            ))}
          </Stack>
          
          <Button 
            variant="outlined" 
            startIcon={<BreakfastDiningIcon />} 
            size="small"
            onClick={() => setOpenPauseDialog(true)}
            disabled={technicians.find(t => t.id === 1)?.status === 'break' || highRiskPredictions.length > 0}
          >
            Demander une pause
          </Button>
        </Box>
      </CardContent>
      
      {/* Dialog pour demander une pause */}
      <Dialog open={openPauseDialog} onClose={() => setOpenPauseDialog(false)}>
        <DialogTitle>Demande de pause</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Veuillez indiquer la durée de la pause souhaitée. 
            Le système analysera si une pause est possible compte tenu des prédictions actuelles.
          </Typography>
          
          <TextField
            label="Durée (minutes)"
            type="number"
            value={pauseDuration}
            onChange={(e) => setPauseDuration(parseInt(e.target.value) || 15)}
            fullWidth
            margin="normal"
            InputProps={{ inputProps: { min: 5, max: 60 } }}
          />
          
          {pauseLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress size={30} />
            </Box>
          )}
          
          {pauseRiskAnalysis && (
            <Box sx={{ mt: 2 }}>
              {pauseRiskAnalysis.is_safe ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Une pause de {pauseDuration} minutes est possible sans risque.
                  </Typography>
                </Alert>
              ) : (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Une anomalie est prévue pendant votre pause (risque: {pauseRiskAnalysis.risk_probability}%).
                    {pauseRiskAnalysis.estimated_issue_time && (
                      <> Problème probable dans {pauseRiskAnalysis.estimated_issue_time}.</>
                    )}
                  </Typography>
                </Alert>
              )}
              
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <AccessTimeIcon color="action" sx={{ mr: 1 }} />
                <Typography variant="body2">
                  Heure de retour recommandée: {pauseRiskAnalysis.recommended_return_time || "Non disponible"}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPauseDialog(false)}>Annuler</Button>
          <Button 
            onClick={handlePauseRequest} 
            disabled={pauseLoading}
            variant="text"
          >
            Analyser
          </Button>
          <Button 
            onClick={handleConfirmPause} 
            color="primary" 
            variant="contained"
            disabled={pauseLoading || (pauseRiskAnalysis && !pauseRiskAnalysis.is_safe)}
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default PredictionPanel;

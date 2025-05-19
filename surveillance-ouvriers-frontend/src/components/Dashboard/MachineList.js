import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Button
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import BuildIcon from '@mui/icons-material/Build';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EngineeringIcon from '@mui/icons-material/Engineering';

/**
 * MachineList component displays a list of machines with their status and sensor information
 */
const MachineList = ({ machines, onSelect, onEmergencyStop, onActivate, onMaintenance }) => {
  // Function to determine status color
  const getStatusColor = (status) => {
    switch(status) {
      case 'active':
        return 'success';
      case 'maintenance':
        return 'warning';
      case 'emergency_stop':
        return 'error';
      case 'offline':
        return 'default';
      default:
        return 'default';
    }
  };

  // Function to format status display text
  const getStatusDisplay = (status) => {
    switch(status) {
      case 'active':
        return 'Actif';
      case 'maintenance':
        return 'Maintenance';
      case 'emergency_stop':
        return 'Arrêt d\'urgence';
      case 'offline':
        return 'Hors ligne';
      default:
        return 'Inconnu';
    }
  };

  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} aria-label="machines table">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Nom</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Emplacement</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell>Capteurs</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {machines.map((machine) => (
            <TableRow
              key={machine.machine_id}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell component="th" scope="row">
                {machine.machine_id}
              </TableCell>
              <TableCell>{machine.name}</TableCell>
              <TableCell>{machine.type}</TableCell>
              <TableCell>{machine.location}</TableCell>
              <TableCell>
                <Chip 
                  label={getStatusDisplay(machine.status)} 
                  color={getStatusColor(machine.status)} 
                  size="small" 
                />
              </TableCell>
              <TableCell>
                {machine.sensors && machine.sensors.map((sensor, index) => (
                  <Chip 
                    key={index}
                    label={sensor}
                    size="small"
                    variant="outlined"
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </TableCell>
              <TableCell>
                <Tooltip title="Voir détails">
                  <IconButton 
                    size="small" 
                    onClick={() => onSelect(machine.machine_id)}
                    color="primary"
                  >
                    <BuildIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                
                {/* Bouton d'arrêt d'urgence */}
                <Button
                  variant="contained"
                  size="small"
                  color="error"
                  startIcon={<WarningIcon />}
                  onClick={() => {
                    console.log(`MachineList: Click sur arrêt d'urgence pour ${machine.machine_id}`);
                    onEmergencyStop(machine.machine_id);
                  }}
                  aria-label="Arrêt d'urgence"
                  disabled={machine.status === 'emergency_stop'}
                  sx={{ mr: 1 }}
                >
                  ARRÊT D'URGENCE
                </Button>
                
                {/* Bouton d'activation (uniquement pour les machines arrêtées) */}
                {(machine.status === 'emergency_stop' || machine.status === 'maintenance') && (
                  <Button
                    variant="contained"
                    size="small"
                    color="success"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => onActivate(machine.machine_id)}
                    aria-label="Activer"
                    sx={{ mr: 1 }}
                  >
                    ACTIVER
                  </Button>
                )}
                
                {/* Bouton de maintenance (uniquement pour les machines actives) */}
                {machine.status === 'active' && (
                  <Button
                    variant="contained"
                    size="small"
                    color="warning"
                    startIcon={<EngineeringIcon />}
                    onClick={() => onMaintenance(machine.machine_id)}
                    aria-label="Maintenance"
                  >
                    MAINTENANCE
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {machines.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center">
                Aucune machine disponible
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default MachineList;

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Snackbar,
  Chip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const MachineManagement = () => {
  const { user } = useAuth();
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [formData, setFormData] = useState({
    machine_id: '',
    name: '',
    type: '',
    location: '',
    status: 'offline',
    sensors: []
  });
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [sensorInput, setSensorInput] = useState('');

  // Verifie si l'utilisateur est un administrateur
  useEffect(() => {
    if (user && user.role !== 'admin') {
      setError("Accès refusé. Seuls les administrateurs peuvent accéder à cette page.");
      setLoading(false);
      return;
    }
    fetchMachines();
  }, [user]);

  const fetchMachines = async () => {
    setLoading(true);
    try {
      const data = await api.machines.getAll();
      setMachines(data);
    } catch (err) {
      console.error('Error fetching machines:', err);
      setError(err.message || 'Impossible de récupérer la liste des machines');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddDialog = () => {
    setFormData({
      machine_id: '',
      name: '',
      type: '',
      location: '',
      status: 'offline',
      sensors: []
    });
    setOpenAddDialog(true);
  };

  const handleOpenEditDialog = (machine) => {
    setSelectedMachine(machine);
    setFormData({
      machine_id: machine.machine_id,
      name: machine.name,
      type: machine.type,
      location: machine.location,
      status: machine.status,
      sensors: [...machine.sensors]
    });
    setOpenEditDialog(true);
  };

  const handleOpenDeleteDialog = (machine) => {
    setSelectedMachine(machine);
    setOpenDeleteDialog(true);
  };

  const handleCloseDialogs = () => {
    setOpenAddDialog(false);
    setOpenEditDialog(false);
    setOpenDeleteDialog(false);
    setSelectedMachine(null);
    setSensorInput('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleAddSensor = () => {
    if (sensorInput && !formData.sensors.includes(sensorInput)) {
      setFormData({
        ...formData,
        sensors: [...formData.sensors, sensorInput]
      });
      setSensorInput('');
    }
  };

  const handleRemoveSensor = (sensor) => {
    setFormData({
      ...formData,
      sensors: formData.sensors.filter(s => s !== sensor)
    });
  };

  const handleAddMachine = async () => {
    try {
      await api.machines.create(formData);
      fetchMachines();
      handleCloseDialogs();
      showNotification('Machine ajoutée avec succès', 'success');
    } catch (err) {
      console.error('Error adding machine:', err);
      showNotification(err.message || 'Erreur lors de l\'ajout de la machine', 'error');
    }
  };

  const handleUpdateMachine = async () => {
    try {
      await api.machines.update(selectedMachine.machine_id, formData);
      fetchMachines();
      handleCloseDialogs();
      showNotification('Machine mise à jour avec succès', 'success');
    } catch (err) {
      console.error('Error updating machine:', err);
      showNotification(err.message || 'Erreur lors de la mise à jour de la machine', 'error');
    }
  };

  const handleDeleteMachine = async () => {
    try {
      await api.machines.delete(selectedMachine.machine_id);
      fetchMachines();
      handleCloseDialogs();
      showNotification('Machine supprimée avec succès', 'success');
    } catch (err) {
      console.error('Error deleting machine:', err);
      showNotification(err.message || 'Erreur lors de la suppression de la machine', 'error');
    }
  };

  const showNotification = (message, severity) => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };

  // Helper function to display status
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

  // Helper function to get status color
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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Gestion des Machines</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenAddDialog}
        >
          Ajouter une machine
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
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
                <TableRow key={machine.machine_id}>
                  <TableCell>{machine.machine_id}</TableCell>
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
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenEditDialog(machine)}
                      size="small"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleOpenDeleteDialog(machine)}
                      size="small"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
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
      )}

      {/* Dialogue d'ajout de machine */}
      <Dialog open={openAddDialog} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
        <DialogTitle>Ajouter une nouvelle machine</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            name="machine_id"
            label="ID de la machine"
            type="text"
            fullWidth
            value={formData.machine_id}
            onChange={handleInputChange}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="name"
            label="Nom de la machine"
            type="text"
            fullWidth
            value={formData.name}
            onChange={handleInputChange}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="type"
            label="Type de machine"
            type="text"
            fullWidth
            value={formData.type}
            onChange={handleInputChange}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="location"
            label="Emplacement"
            type="text"
            fullWidth
            value={formData.location}
            onChange={handleInputChange}
            required
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>Statut</InputLabel>
            <Select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              label="Statut"
            >
              <MenuItem value="offline">Hors ligne</MenuItem>
              <MenuItem value="active">Actif</MenuItem>
              <MenuItem value="maintenance">Maintenance</MenuItem>
              <MenuItem value="emergency_stop">Arrêt d'urgence</MenuItem>
            </Select>
          </FormControl>
          
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            Capteurs
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <TextField
              size="small"
              label="Ajouter un capteur"
              value={sensorInput}
              onChange={(e) => setSensorInput(e.target.value)}
              sx={{ flexGrow: 1, mr: 1 }}
            />
            <Button variant="outlined" onClick={handleAddSensor}>
              Ajouter
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {formData.sensors.map((sensor, index) => (
              <Chip
                key={index}
                label={sensor}
                onDelete={() => handleRemoveSensor(sensor)}
                size="small"
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Annuler</Button>
          <Button onClick={handleAddMachine} color="primary">
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialogue de modification de machine */}
      <Dialog open={openEditDialog} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
        <DialogTitle>Modifier la machine</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            name="machine_id"
            label="ID de la machine"
            type="text"
            fullWidth
            value={formData.machine_id}
            onChange={handleInputChange}
            disabled
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="name"
            label="Nom de la machine"
            type="text"
            fullWidth
            value={formData.name}
            onChange={handleInputChange}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="type"
            label="Type de machine"
            type="text"
            fullWidth
            value={formData.type}
            onChange={handleInputChange}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="location"
            label="Emplacement"
            type="text"
            fullWidth
            value={formData.location}
            onChange={handleInputChange}
            required
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>Statut</InputLabel>
            <Select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              label="Statut"
            >
              <MenuItem value="offline">Hors ligne</MenuItem>
              <MenuItem value="active">Actif</MenuItem>
              <MenuItem value="maintenance">Maintenance</MenuItem>
              <MenuItem value="emergency_stop">Arrêt d'urgence</MenuItem>
            </Select>
          </FormControl>
          
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            Capteurs
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <TextField
              size="small"
              label="Ajouter un capteur"
              value={sensorInput}
              onChange={(e) => setSensorInput(e.target.value)}
              sx={{ flexGrow: 1, mr: 1 }}
            />
            <Button variant="outlined" onClick={handleAddSensor}>
              Ajouter
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {formData.sensors.map((sensor, index) => (
              <Chip
                key={index}
                label={sensor}
                onDelete={() => handleRemoveSensor(sensor)}
                size="small"
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Annuler</Button>
          <Button onClick={handleUpdateMachine} color="primary">
            Mettre à jour
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialogue de confirmation de suppression */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDialogs}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer la machine "{selectedMachine?.name}" (ID: {selectedMachine?.machine_id}) ?
            Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Annuler</Button>
          <Button onClick={handleDeleteMachine} color="error">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MachineManagement;

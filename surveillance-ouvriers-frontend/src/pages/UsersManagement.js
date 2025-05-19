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
  Snackbar
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const UsersManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'worker'
  });
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Verifie si l'utilisateur est un administrateur
  useEffect(() => {
    if (user && user.role !== 'admin') {
      setError("Accès refusé. Seuls les administrateurs peuvent accéder à cette page.");
      setLoading(false);
      return;
    }
    fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.users.getAll();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Impossible de récupérer la liste des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddDialog = () => {
    setFormData({
      username: '',
      password: '',
      name: '',
      role: 'worker'
    });
    setOpenAddDialog(true);
  };

  const handleOpenEditDialog = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: '', // On ne récupère jamais le mot de passe pour des raisons de sécurité
      name: user.name,
      role: user.role
    });
    setOpenEditDialog(true);
  };

  const handleOpenDeleteDialog = (user) => {
    setSelectedUser(user);
    setOpenDeleteDialog(true);
  };

  const handleCloseDialogs = () => {
    setOpenAddDialog(false);
    setOpenEditDialog(false);
    setOpenDeleteDialog(false);
    setSelectedUser(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleAddUser = async () => {
    try {
      await api.users.create(formData);
      fetchUsers();
      handleCloseDialogs();
      showNotification('Utilisateur ajouté avec succès', 'success');
    } catch (err) {
      console.error('Error adding user:', err);
      showNotification(err.message || 'Erreur lors de l\'ajout de l\'utilisateur', 'error');
    }
  };

  const handleUpdateUser = async () => {
    try {
      // Si le mot de passe est vide, ne pas l'inclure dans la mise à jour
      const dataToSend = { ...formData };
      if (!dataToSend.password) {
        delete dataToSend.password;
      }
      
      await api.users.update(selectedUser.id, dataToSend);
      fetchUsers();
      handleCloseDialogs();
      showNotification('Utilisateur mis à jour avec succès', 'success');
    } catch (err) {
      console.error('Error updating user:', err);
      showNotification(err.message || 'Erreur lors de la mise à jour de l\'utilisateur', 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (selectedUser && selectedUser.id === user.id) {
      showNotification('Vous ne pouvez pas supprimer votre propre compte', 'error');
      handleCloseDialogs();
      return;
    }
    
    try {
      await api.users.delete(selectedUser.id);
      fetchUsers();
      handleCloseDialogs();
      showNotification('Utilisateur supprimé avec succès', 'success');
    } catch (err) {
      console.error('Error deleting user:', err);
      showNotification(err.message || 'Erreur lors de la suppression de l\'utilisateur', 'error');
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Gestion des Utilisateurs</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenAddDialog}
        >
          Ajouter un utilisateur
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nom d'utilisateur</TableCell>
              <TableCell>Nom complet</TableCell>
              <TableCell>Rôle</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>
                  <Box sx={{ 
                    display: 'inline-block', 
                    bgcolor: user.role === 'admin' ? 'secondary.main' : 'primary.main',
                    color: 'white',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.875rem'
                  }}>
                    {user.role === 'admin' ? 'Administrator' : 'Worker'}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <IconButton color="primary" onClick={() => handleOpenEditDialog(user)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleOpenDeleteDialog(user)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialogue d'ajout d'utilisateur */}
      <Dialog open={openAddDialog} onClose={handleCloseDialogs}>
        <DialogTitle>Ajouter un nouvel utilisateur</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="username"
            label="Nom d'utilisateur"
            type="text"
            fullWidth
            value={formData.username}
            onChange={handleInputChange}
            required
          />
          <TextField
            margin="dense"
            name="password"
            label="Mot de passe"
            type="password"
            fullWidth
            value={formData.password}
            onChange={handleInputChange}
            required
          />
          <TextField
            margin="dense"
            name="name"
            label="Nom complet"
            type="text"
            fullWidth
            value={formData.name}
            onChange={handleInputChange}
            required
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Rôle</InputLabel>
            <Select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              label="Rôle"
            >
              <MenuItem value="worker">Worker</MenuItem>
              <MenuItem value="admin">Administrator</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Annuler</Button>
          <Button onClick={handleAddUser} color="primary">
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialogue de modification d'utilisateur */}
      <Dialog open={openEditDialog} onClose={handleCloseDialogs}>
        <DialogTitle>Modifier l'utilisateur</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="username"
            label="Nom d'utilisateur"
            type="text"
            fullWidth
            value={formData.username}
            onChange={handleInputChange}
            disabled={selectedUser && selectedUser.id === user.id} // Empêcher la modification de son propre nom d'utilisateur
          />
          <TextField
            margin="dense"
            name="password"
            label="Nouveau mot de passe (laisser vide pour ne pas changer)"
            type="password"
            fullWidth
            value={formData.password}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            name="name"
            label="Nom complet"
            type="text"
            fullWidth
            value={formData.name}
            onChange={handleInputChange}
            required
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Rôle</InputLabel>
            <Select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              label="Rôle"
              disabled={selectedUser && selectedUser.id === user.id} // Empêcher la modification de son propre rôle
            >
              <MenuItem value="worker">Worker</MenuItem>
              <MenuItem value="admin">Administrator</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Annuler</Button>
          <Button onClick={handleUpdateUser} color="primary">
            Mettre à jour
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialogue de confirmation de suppression */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDialogs}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer l'utilisateur "{selectedUser?.name}" ({selectedUser?.username}) ?
            Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Annuler</Button>
          <Button onClick={handleDeleteUser} color="error">
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

export default UsersManagement;

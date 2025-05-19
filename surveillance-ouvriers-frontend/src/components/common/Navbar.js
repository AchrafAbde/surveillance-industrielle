import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  Box,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/ExitToApp';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import WarningIcon from '@mui/icons-material/Warning';
import PeopleIcon from '@mui/icons-material/People';
import BuildIcon from '@mui/icons-material/Build';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAlerts } from '../../context/AlertsContext';

/**
 * Navbar component for the application header
 */
const Navbar = () => {
  const { user, logout } = useAuth();
  const { getActiveAlerts } = useAlerts();
  const navigate = useNavigate();
  
  const [notificationsAnchor, setNotificationsAnchor] = React.useState(null);
  const [userMenuAnchor, setUserMenuAnchor] = React.useState(null);
  
  // Get number of active alerts
  const activeAlerts = getActiveAlerts().filter(alert => 
    alert.message && alert.message.includes('ARRÊT D\'URGENCE')
  );
  const activeAlertsCount = activeAlerts.length;
  
  // Handle opening notifications menu
  const handleOpenNotifications = (event) => {
    setNotificationsAnchor(event.currentTarget);
  };
  
  // Handle closing notifications menu
  const handleCloseNotifications = () => {
    setNotificationsAnchor(null);
  };
  
  // Handle opening user menu
  const handleOpenUserMenu = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };
  
  // Handle closing user menu
  const handleCloseUserMenu = () => {
    setUserMenuAnchor(null);
  };
  
  // Handle logout
  const handleLogout = () => {
    handleCloseUserMenu();
    logout();
  };
  
  // Navigate to dashboard
  const goToDashboard = () => {
    navigate('/dashboard');
  };

  // Navigate to users management (admin only)
  const goToUsersManagement = () => {
    navigate('/dashboard/users');
    handleCloseUserMenu();
  };

  // Navigate to machine management (admin only)
  const goToMachineManagement = () => {
    navigate('/machines');
    handleCloseUserMenu();
  };

  // Afficher les informations de l'utilisateur connecté pour déboguer
  console.log('Utilisateur connecté:', user);
  
  // Déterminer le rôle de l'utilisateur
  const isAdmin = user && user.role === 'admin';
  
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Système de Surveillance Industrielle
        </Typography>
        
        {/* Affichage du rôle et nom de l'utilisateur */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <Typography variant="body2" sx={{ mr: 1 }}>
            {isAdmin 
              ? `Connecté en tant que: Administrator (${user?.username})` 
              : `Connecté en tant que: Worker (${user?.username})`
            }
          </Typography>
        </Box>
        
        {/* Notifications icon with badge */}
        <IconButton
          color="inherit"
          onClick={handleOpenNotifications}
          aria-controls="notifications-menu"
          aria-haspopup="true"
        >
          <Badge badgeContent={activeAlertsCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
        
        {/* Notifications menu */}
        <Menu
          id="notifications-menu"
          anchorEl={notificationsAnchor}
          keepMounted
          open={Boolean(notificationsAnchor)}
          onClose={handleCloseNotifications}
          PaperProps={{
            style: {
              maxHeight: 400,
              width: 350,
            },
          }}
        >
          <Box sx={{ p: 1, textAlign: 'center' }}>
            <Typography variant="subtitle1">Alertes actives</Typography>
          </Box>
          <Divider />
          
          {activeAlerts.length === 0 ? (
            <MenuItem>
              <ListItemText primary="Aucune alerte active" />
            </MenuItem>
          ) : (
            activeAlerts.map((alert, index) => (
              <MenuItem key={alert._id || index} onClick={() => navigate('/dashboard')}>
                <ListItemIcon>
                  <WarningIcon color="error" />
                </ListItemIcon>
                <ListItemText 
                  primary={`ARRÊT D'URGENCE: Machine ${alert.machine_id}`} 
                  secondary={new Date(alert.timestamp).toLocaleString('fr-FR')} 
                />
              </MenuItem>
            ))
          )}
          
          {activeAlerts.length > 5 && (
            <Box sx={{ p: 1, textAlign: 'center' }}>
              <Button 
                size="small" 
                onClick={() => {
                  navigate('/dashboard');
                  handleCloseNotifications();
                }}
              >
                Voir toutes les alertes ({activeAlerts.length})
              </Button>
            </Box>
          )}
        </Menu>
        
        {/* User menu button */}
        <Button 
          color="inherit" 
          onClick={handleOpenUserMenu}
          startIcon={<PersonIcon />}
        >
          {isAdmin ? "Administrator" : "Worker"}
        </Button>
        
        {/* User menu */}
        <Menu
          id="user-menu"
          anchorEl={userMenuAnchor}
          keepMounted
          open={Boolean(userMenuAnchor)}
          onClose={handleCloseUserMenu}
        >
          <MenuItem onClick={goToDashboard}>
            <ListItemIcon>
              <DashboardIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Tableau de bord" />
          </MenuItem>
          
          {/* Option de gestion des utilisateurs pour les admins */}
          {isAdmin && (
            <>
              <MenuItem onClick={goToUsersManagement}>
                <ListItemIcon>
                  <PeopleIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Gestion des utilisateurs" />
              </MenuItem>
              <MenuItem onClick={goToMachineManagement}>
                <ListItemIcon>
                  <BuildIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Gestion des machines" />
              </MenuItem>
            </>
          )}
          
          <Divider />
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Déconnexion" />
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;

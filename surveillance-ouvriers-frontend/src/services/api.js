/**
 * API service for handling all API requests
 * This centralizes API access and handles common functionality like authentication headers
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Generic API request function
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise} - Response promise
 */
const apiRequest = async (endpoint, options = {}) => {
  // Get token from localStorage
  const token = localStorage.getItem('token');
  
  // Set headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // Add authorization header if token exists and this is not a login request
  if (token && !endpoint.includes('/login')) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Make request
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
    
    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      // If response is not ok, throw error with response data
      if (!response.ok) {
        const error = new Error(data.error || 'Une erreur est survenue');
        error.status = response.status;
        throw error;
      }
      
      return data;
    } else {
      // Handle non-JSON response
      if (!response.ok) {
        const error = new Error('Une erreur est survenue');
        error.status = response.status;
        throw error;
      }
      
      return await response.text();
    }
  } catch (error) {
    if (error.status === 401) {
      // Clear token if unauthorized
      localStorage.removeItem('token');
    }
    
    // Re-throw to be handled by caller
    throw error;
  }
};

/**
 * API service object with methods for each endpoint
 */
const api = {
  // Auth endpoints
  auth: {
    login: async (username, password) => {
      try {
        console.log(`Tentative de connexion avec l'utilisateur: ${username}`);
        
        const response = await apiRequest('/api/login', {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        });
        
        // Débogage - Afficher les données renvoyées
        console.log('Données de connexion renvoyées:', response);
        console.log('Informations utilisateur:', response.user);
        
        if (response.user) {
          console.log(`Rôle utilisateur: ${response.user.role}`);
          console.log(`Nom d'utilisateur: ${response.user.username}`);
        }
        
        return response;
      } catch (error) {
        console.error('Erreur de connexion:', error);
        
        if (error.status) {
          throw new Error(error.message || 'Login failed');
        }
        throw new Error('Login failed. Please check your connection.');
      }
    },
    
    getUser: () => 
      apiRequest('/api/me'),
  },
  
  // Machines endpoints
  machines: {
    getAll: () => 
      apiRequest('/api/machines'),
    
    getById: (machineId) => 
      apiRequest(`/api/machines/${machineId}`),
    
    // Fonction d'arrêt d'urgence corrigée pour appeler le bon endpoint
    emergencyStop: (machineId) => {
      console.log(`Appel d'arrêt d'urgence pour machine: ${machineId}`);
      
      // IMPORTANT: Utilisation du vrai endpoint qui existe dans backend/app.py
      return apiRequest(`/api/machines/${machineId}/status`, {
        method: 'POST',
        body: JSON.stringify({
          status: 'emergency_stop',
          reason: "Arrêt d'urgence manuel"
        }),
      })
      .then(response => {
        console.log('Réponse arrêt d\'urgence:', response);
        return response;
      });
    },
    
    // Fonction pour activer une machine (la rendre active)
    activateMachine: (machineId) => {
      return apiRequest(`/api/machines/${machineId}/status`, {
        method: 'POST',
        body: JSON.stringify({
          status: 'active',
          reason: "Activation manuelle"
        }),
      });
    },
    
    // Fonction pour mettre une machine en maintenance
    setMaintenanceMode: (machineId) => {
      return apiRequest(`/api/machines/${machineId}/status`, {
        method: 'POST',
        body: JSON.stringify({
          status: 'maintenance',
          reason: "Mise en maintenance manuelle"
        }),
      });
    },

    // Fonction pour créer une nouvelle machine
    create: (machineData) => {
      console.log('Création d\'une nouvelle machine:', machineData);
      return apiRequest('/api/machines', {
        method: 'POST',
        body: JSON.stringify(machineData),
      });
    },
    
    // Fonction pour mettre à jour une machine existante
    update: (machineId, machineData) => {
      console.log(`Mise à jour de la machine ${machineId}:`, machineData);
      return apiRequest(`/api/machines/${machineId}`, {
        method: 'PUT',
        body: JSON.stringify(machineData),
      });
    },
    
    // Fonction pour supprimer une machine
    delete: (machineId) => {
      console.log(`Suppression de la machine ${machineId}`);
      return apiRequest(`/api/machines/${machineId}`, {
        method: 'DELETE',
      });
    },
  },
  
  // Sensor data endpoints
  sensors: {
    getAllForMachine: (machineId, limit = 100) => 
      apiRequest(`/api/sensor-data/${machineId}?limit=${limit}`),
    
    getBySensorType: (machineId, sensorType, limit = 100) => 
      apiRequest(`/api/sensor-data/${machineId}?sensor_type=${sensorType}&limit=${limit}`),
    
    sendData: (data) => 
      apiRequest('/api/sensor-data', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  
  // Alerts endpoints
  alerts: {
    // Récupérer toutes les alertes
    getAll: () => {
      console.log('Appel API: Récupération de toutes les alertes');
      return apiRequest('/api/alerts')
        .then(response => {
          console.log('API alertes réponse:', response);
          return response || [];
        });
    },
    
    // Résoudre une alerte
    resolve: (alertId) => {
      console.log(`Appel API: Résolution de l'alerte ${alertId}`);
      return apiRequest(`/api/alerts/${alertId}/resolve`, {
        method: 'POST'
      })
      .then(response => {
        console.log('API résolution réponse:', response);
        return response;
      })
      .catch(error => {
        console.error('Erreur lors de la résolution:', error);
        throw error;
      });
    },
    
    // Supprimer une alerte
    delete: (alertId) => 
      apiRequest(`/api/alerts/${alertId}`, {
        method: 'DELETE'
      }),
    
    getByStatus: (status) => 
      apiRequest(`/api/alerts?status=${status}`),
    
    getHistory: (days = 30) => 
      apiRequest(`/api/alerts/history?days=${days}`),
    
    getStats: () => 
      apiRequest('/api/alerts/stats'),
      
    createPredictiveAlert: (alertData) =>
      apiRequest('/api/alerts/predictive', {
        method: 'POST',
        body: JSON.stringify(alertData),
      }),
  },
  
  predictions: {
    getAll: () => 
      apiRequest('/api/predictions'),
    
    getByMachineId: (machineId) => 
      apiRequest(`/api/predictions/${machineId}`),
    
    updateSensitivity: (settings) => 
      apiRequest('/api/predictions/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      }),
      
    predictNext30Minutes: () => 
      apiRequest('/api/predict-next-30min'),
  },
  
  // Users management endpoints (pour administration)
  users: {
    getAll: () => 
      apiRequest('/api/users'),
    
    getById: (userId) => 
      apiRequest(`/api/users/${userId}`),
    
    create: (userData) => 
      apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),
    
    update: (userId, userData) => 
      apiRequest(`/api/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      }),
    
    delete: (userId) => 
      apiRequest(`/api/users/${userId}`, {
        method: 'DELETE',
      }),
  },
  
  workers: {
    getAll: () => 
      apiRequest('/api/workers'),
      
    getById: (workerId) => 
      apiRequest(`/api/workers/${workerId}`),
      
    analyzePauseRisk: (machineId, duration) => 
      apiRequest(`/api/workers/analyze-pause`, {
        method: 'POST',
        body: JSON.stringify({ machine_id: machineId, duration }),
      }),
      
    requestPause: (machineId, duration) => 
      apiRequest('/api/workers/request-pause', {
        method: 'POST',
        body: JSON.stringify({ machine_id: machineId, duration }),
      }),
      
    endPause: (workerId) => 
      apiRequest(`/api/workers/${workerId}/end-pause`, {
        method: 'POST',
      }),
      
    assignToMachine: (workerId, machineId) => 
      apiRequest(`/api/workers/${workerId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ machine_id: machineId }),
      }),
  },
};

export default api;

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // État utilisateur et authentification
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  
  // Fonction de déconnexion
  const logout = () => {
    console.log('Logout appelé');
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log('LocalStorage effacé et état réinitialisé');
    navigate('/');
  };

  // Fonction de connexion
  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Tentative de connexion pour l'utilisateur: ${username}`);
      
      const data = await api.auth.login(username, password);
      
      console.log('Détails du data reçu', data);
      console.log(`Rôle de l'utilisateur: ${data.user?.role}`);
      console.log(`Nom d'utilisateur: ${data.user?.username}`);
      
      // Stocker les informations de l'utilisateur
      setToken(data.token);
      setUser(data.user);
      setIsAuthenticated(true);
      
      // Stocker dans localStorage pour persistance
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      console.log('Utilisateur connexion réussie:', data.user);
      console.log('Redirection vers le tableau de bord');
      
      navigate('/dashboard');
      return true;
    } catch (error) {
      console.error('Erreur de connexion:', error);
      setError(error.message || 'Echec de connexion');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Au chargement du composant, nous vérifions s'il y a des données d'authentification
  // stockées localement
  useEffect(() => {
    const checkAuth = () => {
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      console.log('Vérification du token:', savedToken ? 'Token trouvé' : 'Pas de token');
      console.log('Vérification des données utilisateur:', savedUser ? 'Données trouvées' : 'Pas de données');

      // Si nous avons un token et des données utilisateur, nous restaurant la session
      if (savedToken && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          console.log('Restauration de la session pour:', parsedUser.username);
          console.log('Rôle de la session restaurée:', parsedUser.role);

          setToken(savedToken);
          setUser(parsedUser);
          setIsAuthenticated(true);
        } catch (e) {
          console.error('Erreur lors de la restauration de la session:', e);
          // En cas d'erreur, nous réinitialisons tout
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } else {
        console.log('Aucune session d\'utilisateur trouvée');
      }
    };

    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      loading,
      error,
      isAuthenticated
    }}>
      {children}
    </AuthContext.Provider>
  );
};

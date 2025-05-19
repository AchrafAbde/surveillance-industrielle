import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './App.css';

// Import components
import Login from './pages/login';
import Dashboard from './pages/Dashboard';
import Navbar from './components/common/Navbar';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { AlertsProvider } from './context/AlertsContext';
import { SocketProvider } from './context/SocketContext';
import GlobalAlertNotification from './components/Alerts/GlobalAlertNotification';
import MachineManagement from './pages/MachineManagement';

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <AlertsProvider>
            <div className="app-container">
              <GlobalAlertNotification />
              <div className="content-container">
                <Routes>
                  {/* La page de login est maintenant la route principale */}
                  <Route path="/" element={<Login />} />
                  <Route 
                    path="/dashboard/*" 
                    element={
                      <ProtectedRoute>
                        <>
                          <Navbar />
                          <Dashboard />
                        </>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/machines" 
                    element={
                      <ProtectedRoute>
                        <>
                          <Navbar />
                          <MachineManagement />
                        </>
                      </ProtectedRoute>
                    } 
                  />
                  {/* En cas d'URL inconnue, rediriger vers la page de login */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </div>
          </AlertsProvider>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

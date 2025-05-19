import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import createMockSocketIO from '../services/socket-mock';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { token, isAuthenticated } = useAuth();

  useEffect(() => {
    // Only connect to socket if user is authenticated
    if (!isAuthenticated || !token) return;

    let socketInstance;
    try {
      socketInstance = io(API_URL, {
        auth: {
          token
        },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketInstance.on('connect', () => {
        console.log('Socket connected');
        setConnected(true);
      });

      socketInstance.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnected(false);
        
        // If we've had multiple failed attempts, fall back to mock socket
        if (socketInstance.io.reconnectionAttempts === 0) {
          console.log('Using mock socket as fallback');
          // Disconnect the real socket
          socketInstance.disconnect();
          
          // Create a mock socket
          const mockSocket = createMockSocketIO().connect();
          setSocket(mockSocket);
          setConnected(true);
        }
      });

      setSocket(socketInstance);
    } catch (error) {
      console.error('Failed to initialize socket:', error);
      // Fall back to mock socket
      const mockSocket = createMockSocketIO().connect();
      setSocket(mockSocket);
      setConnected(true);
    }

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [isAuthenticated, token]);

  const subscribe = (event, callback) => {
    if (!socket) return () => {};
    
    socket.on(event, callback);
    
    return () => {
      socket.off(event, callback);
    };
  };

  const emit = (event, data) => {
    if (!socket) return;
    socket.emit(event, data);
  };

  return (
    <SocketContext.Provider value={{ socket, connected, subscribe, emit }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;

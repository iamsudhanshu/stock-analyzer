import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    const initializeSocket = () => {
      const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
      
      const newSocket = io(socketUrl, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        timeout: 20000
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('Connected to server');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
        setIsConnected(false);
        
        if (reason === 'io server disconnect') {
          // Server disconnected the socket, try to reconnect manually
          newSocket.connect();
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        reconnectAttempts.current += 1;
        
        if (reconnectAttempts.current >= maxReconnectAttempts) {
          setConnectionError('Failed to connect to server. Please check your connection and try again.');
        }
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log('Reconnected after', attemptNumber, 'attempts');
        setIsConnected(true);
        setConnectionError(null);
      });

      newSocket.on('reconnect_failed', () => {
        console.error('Failed to reconnect to server');
        setConnectionError('Connection lost. Please refresh the page to try again.');
      });

      // Server-specific event handlers
      newSocket.on('connected', (data) => {
        console.log('Server connection confirmed:', data);
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      setSocket(newSocket);

      return newSocket;
    };

    const socketInstance = initializeSocket();

    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  // Subscribe to analysis progress updates
  const subscribeToAnalysis = (requestId, callbacks = {}) => {
    if (!socket) {
      console.warn('Socket not connected');
      return () => {};
    }

    const {
      onProgress = () => {},
      onCompleted = () => {},
      onError = () => {}
    } = callbacks;

    // Subscribe to the specific request
    socket.emit('subscribe', { requestId });

    // Set up event listeners
    const handleProgress = (data) => {
      if (data.requestId === requestId) {
        onProgress(data);
      }
    };

    const handleCompleted = (data) => {
      if (data.requestId === requestId) {
        onCompleted(data);
        // Auto-unsubscribe on completion
        socket.emit('unsubscribe', { requestId });
      }
    };

    const handleError = (data) => {
      if (data.requestId === requestId) {
        onError(data);
        // Auto-unsubscribe on error
        socket.emit('unsubscribe', { requestId });
      }
    };

    const handleSubscribed = (data) => {
      if (data.requestId === requestId) {
        console.log('Subscribed to analysis:', requestId);
      }
    };

    // Register event listeners
    socket.on('progress', handleProgress);
    socket.on('completed', handleCompleted);
    socket.on('error', handleError);
    socket.on('subscribed', handleSubscribed);

    // Return cleanup function
    return () => {
      socket.off('progress', handleProgress);
      socket.off('completed', handleCompleted);
      socket.off('error', handleError);
      socket.off('subscribed', handleSubscribed);
      socket.emit('unsubscribe', { requestId });
    };
  };

  // Get connection status
  const getConnectionStatus = () => ({
    isConnected,
    hasError: !!connectionError,
    error: connectionError,
    socketId: socket?.id
  });

  // Manually reconnect
  const reconnect = () => {
    if (socket) {
      reconnectAttempts.current = 0;
      setConnectionError(null);
      socket.connect();
    }
  };

  const contextValue = {
    socket,
    isConnected,
    connectionError,
    subscribeToAnalysis,
    getConnectionStatus,
    reconnect
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext; 
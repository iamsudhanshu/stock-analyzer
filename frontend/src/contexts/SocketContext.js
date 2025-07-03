import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';

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

  useEffect(() => {
    console.log('🔌 [SocketContext] Initializing socket connection...');
    
    // Create socket connection
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('✅ [SocketContext] Connected to server with ID:', newSocket.id);
      setIsConnected(true);
      setConnectionError(null);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ [SocketContext] Disconnected from server. Reason:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('🚫 [SocketContext] Connection error:', error);
      setConnectionError(`Connection failed: ${error.message}`);
      setIsConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('🔄 [SocketContext] Reconnected after', attemptNumber, 'attempts');
      setConnectionError(null);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('🔄❌ [SocketContext] Reconnection failed:', error);
      setConnectionError(`Reconnection failed: ${error.message}`);
    });

    // Analysis-specific event handlers
    newSocket.on('progress', (data) => {
      console.log('📊 [SocketContext] Progress update received:', data);
    });

    newSocket.on('analysisCompleted', (data) => {
      console.log('✅ [SocketContext] Analysis completed:', data);
    });

    newSocket.on('analysisError', (data) => {
      console.error('❌ [SocketContext] Analysis error:', data);
    });

    // Generic message handler for debugging
    newSocket.onAny((eventName, ...args) => {
      console.log(`📡 [SocketContext] Received event: ${eventName}`, args);
    });

    setSocket(newSocket);

    return () => {
      console.log('🔌❌ [SocketContext] Cleaning up socket connection...');
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('connect_error');
      newSocket.off('reconnect');
      newSocket.off('reconnect_error');
      newSocket.off('progress');
      newSocket.off('analysisCompleted');
      newSocket.off('analysisError');
      newSocket.offAny();
      newSocket.disconnect();
    };
  }, []);

  const subscribeToAnalysis = useCallback((requestId, callbacks) => {
    console.log(`🔔 [SocketContext] Subscribing to analysis updates for request:`, requestId);
    console.log('🔔 [SocketContext] Callbacks provided:', Object.keys(callbacks));
    
    if (!socket) {
      console.error('❌ [SocketContext] Cannot subscribe - socket not available');
      return () => {};
    }

    // IMPORTANT: Subscribe to the specific request room on the backend
    console.log(`📡 [SocketContext] Emitting subscribe event for requestId: ${requestId}`);
    socket.emit('subscribe', { requestId });

    const handleProgress = (data) => {
      console.log(`📊 [SocketContext] Progress for ${requestId}:`, data);
      if (data.requestId === requestId && callbacks.onProgress) {
        callbacks.onProgress(data);
      }
    };

    const handleCompleted = (data) => {
      console.log(`✅ [SocketContext] Completed for ${requestId}:`, data);
      if (data.requestId === requestId && callbacks.onCompleted) {
        callbacks.onCompleted(data);
      }
    };

    const handleError = (data) => {
      console.error(`❌ [SocketContext] Error for ${requestId}:`, data);
      if (data.requestId === requestId && callbacks.onError) {
        callbacks.onError(data);
      }
    };

    const handleSubscribed = (data) => {
      console.log(`✅ [SocketContext] Successfully subscribed to room for ${requestId}:`, data);
    };

    // Subscribe to events
    socket.on('progress', handleProgress);
    socket.on('analysisCompleted', handleCompleted);
    socket.on('analysisError', handleError);
    socket.on('subscribed', handleSubscribed);

    console.log(`✅ [SocketContext] Successfully subscribed to events for ${requestId}`);

    // Return unsubscribe function
    return () => {
      console.log(`🔕 [SocketContext] Unsubscribing from analysis updates for request:`, requestId);
      
      // Unsubscribe from the backend room
      socket.emit('unsubscribe', { requestId });
      
      // Remove event listeners
      socket.off('progress', handleProgress);
      socket.off('analysisCompleted', handleCompleted);
      socket.off('analysisError', handleError);
      socket.off('subscribed', handleSubscribed);
    };
  }, [socket]);

  const reconnect = useCallback(() => {
    console.log('🔄 [SocketContext] Manual reconnection attempt...');
    if (socket) {
      socket.connect();
    }
  }, [socket]);

  const value = {
    socket,
    isConnected,
    connectionError,
    subscribeToAnalysis,
    reconnect,
  };

  console.log('🏗️ [SocketContext] Provider rendering with state:', {
    socketConnected: !!socket,
    isConnected,
    connectionError: !!connectionError
  });

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext; 
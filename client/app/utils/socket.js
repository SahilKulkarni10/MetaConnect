import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { API_BASE_URL, getBaseServerUrl } from './api';
import NetworkDiagnostic from './networkDiagnostic';

let socket = null;
let connectionAttempts = 0;
const MAX_RECONNECTION_ATTEMPTS = 5;
let reconnectionAbandoned = false;
let serverDiscoveryInProgress = false;
let unsubscribeNetInfo = null;

// Enhanced network change handler with profile support
const setupNetworkListener = () => {
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo();
  }

  unsubscribeNetInfo = NetInfo.addEventListener(async (state) => {
    console.log('Network state changed:', state);
    
    if (state.isConnected) {
      // Wait for network to stabilize
      setTimeout(async () => {
        try {
          // Try to load network profile first
          const profile = await NetworkDiagnostic.loadNetworkProfile();
          if (profile) {
            console.log('Found network profile, attempting to connect...');
            const result = await NetworkDiagnostic.testServerConnection(profile.serverIP);
            if (result.success) {
              await setServerIP(profile.serverIP);
              await initializeSocket();
              return;
            }
          }

          // If profile doesn't exist or fails, try mDNS
          try {
            const response = await fetch('http://sat-server.local:50002/health', {
              timeout: 2000
            });
            if (response.ok) {
              console.log('Found server via mDNS');
              await setServerIP('sat-server.local');
              await initializeSocket();
              return;
            }
          } catch (e) {
            // mDNS failed, continue with other methods
          }

          // Try to discover server on the new network
          const discoveredServer = await NetworkDiagnostic.discoverServer();
          if (discoveredServer) {
            console.log('Found server on new network:', discoveredServer);
            await NetworkDiagnostic.saveNetworkProfile(discoveredServer.ip);
            await setServerIP(discoveredServer.ip);
            await initializeSocket();
          }
        } catch (error) {
          console.error('Error handling network change:', error);
        }
      }, 2000);
    }
  });
};

// Helper to get the correct URL based on platform
const getSocketUrl = async () => {
  try {
    const serverIP = await AsyncStorage.getItem('serverIP') || '192.168.0.159';
    const serverPort = '50002';
    
    if (Platform.OS === 'web') {
      return `http://localhost:${serverPort}`;
    }
    
    // For Android emulator, use the special emulator host IP
    if (Platform.OS === 'android') {
      const netInfo = await NetInfo.fetch();
      if (netInfo.type === 'wifi' && netInfo.details && netInfo.details.isEmulator) {
        return `http://10.0.2.2:${serverPort}`;
      }
    }
    
    // For mobile devices, use the IP address
    return `http://${serverIP}:${serverPort}`;
  } catch (error) {
    console.warn('Error getting socket URL:', error);
    return 'http://192.168.0.159:50002'; // Updated fallback to correct IP
  }
};

// Function to save a new server IP
export const setServerIP = async (newIP) => {
  try {
    await AsyncStorage.setItem('serverIP', newIP);
    console.log(`Server IP saved: ${newIP}`);
    return true;
  } catch (error) {
    console.error('Error saving server IP:', error);
    return false;
  }
};

// Try to extract the current API server IP from the API_BASE_URL
const getAPIServerIP = () => {
  try {
    // If we have a global API_BASE_URL, try to extract the server IP from it
    if (API_BASE_URL) {
      const match = API_BASE_URL.match(/http:\/\/([^:]+):/);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  } catch (error) {
    console.warn('Error extracting API server IP:', error);
    return null;
  }
};

// Test the server connection with a health check before attempting socket connection
const testServerHealth = async (url) => {
  try {
    const baseUrl = url.split('/socket.io')[0];
    const healthUrl = `${baseUrl}/health`;
    console.log(`Testing server health at: ${healthUrl}`);
    
    // Use our improved network diagnostic tool
    const result = await NetworkDiagnostic.testServerConnection(
      baseUrl.replace('http://', '').split(':')[0], // Extract IP
      baseUrl.includes(':') ? baseUrl.split(':')[2] : '50002', // Extract port
      '/health',
      8000 // 8 second timeout
    );
    
    if (result.success) {
      console.log('Server health check successful:', result.data);
      return true;
    } else {
      console.error('Server health check failed:', result.message);
      return false;
    }
  } catch (error) {
    console.error('Server health check error:', error);
    return false;
  }
};

// Check if network is connected
const checkNetworkConnectivity = async () => {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected;  // Don't require isInternetReachable to be true for local connections
  } catch (error) {
    console.error('Error checking network:', error);
    return false;
  }
};

// Enhanced connection strategy with profile support
const tryMultipleConnections = async () => {
  // Try loading network profile first
  try {
    const profile = await NetworkDiagnostic.loadNetworkProfile();
    if (profile) {
      const isHealthy = await testServerHealth(`http://${profile.serverIP}:50002`);
      if (isHealthy) {
        console.log('Connected using saved network profile');
        return `http://${profile.serverIP}:50002`;
      }
    }
  } catch (error) {
    console.log('Error using network profile:', error);
  }

  // Try mDNS first
  try {
    const response = await fetch('http://sat-server.local:50002/health', {
      timeout: 2000
    });
    if (response.ok) {
      return 'http://sat-server.local:50002';
    }
  } catch (e) {
    // mDNS failed, continue with other methods
  }

  // Try the API-derived URL
  try {
    const apiUrl = await getBaseServerUrl();
    if (apiUrl) {
      const isHealthy = await testServerHealth(apiUrl);
      if (isHealthy) {
        return apiUrl;
      }
    }
  } catch (error) {
    console.log('Could not connect using API URL:', error);
  }
  
  // Try local discovery
  try {
    const discoveryResult = await NetworkDiagnostic.discoverServer();
    if (discoveryResult) {
      const serverUrl = `http://${discoveryResult.ip}:${discoveryResult.port}`;
      await setServerIP(discoveryResult.ip);
      return serverUrl;
    }
  } catch (error) {
    console.log('Server discovery failed:', error);
  }

  // Try platform-specific defaults
  if (Platform.OS === 'ios') {
    const localhostUrl = 'http://localhost:50002';
    const isHealthy = await testServerHealth(localhostUrl);
    if (isHealthy) return localhostUrl;
  } else if (Platform.OS === 'android') {
    const emulatorUrl = 'http://10.0.2.2:50002';
    const isHealthy = await testServerHealth(emulatorUrl);
    if (isHealthy) {
      await setServerIP('10.0.2.2');
      return emulatorUrl;
    }
  }

  // Try saved location profiles as last resort
  try {
    const location = await NetworkDiagnostic.autoDetectLocation();
    if (location) {
      return `http://${location.serverIP}:50002`;
    }
  } catch (error) {
    console.log('Location profile detection failed:', error);
  }

  // Last resort: try the generated socket URL
  return await getSocketUrl();
};

export const initializeSocket = async () => {
  try {
    // Setup network change listener if not already setup
    if (!unsubscribeNetInfo) {
      setupNetworkListener();
    }
    
    // First check network connectivity
    const isConnected = await checkNetworkConnectivity();
    if (!isConnected) {
      console.error('No network connectivity. Cannot initialize socket.');
      return null;
    }
    
    if (socket && socket.connected) {
      console.log('Socket already connected, returning existing socket');
      return socket;
    }
    
    // Clean up any existing socket
    if (socket) {
      removeAllListeners();
      socket.disconnect();
      socket = null;
      connectionAttempts = 0;
      reconnectionAbandoned = false;
    }
    
    // Get auth token from storage
    const token = await AsyncStorage.getItem('token');
    
    // Try multiple connection strategies to find a working server
    const socketUrl = await tryMultipleConnections();
    console.log(`Attempting to connect to socket at: ${socketUrl}`);
    
    // Initialize new socket with improved config
    socket = io(socketUrl, {
      auth: token ? { token } : undefined,
      // Use both transports, but try polling first for greater compatibility
      transports: ['polling', 'websocket'],
      reconnectionAttempts: MAX_RECONNECTION_ATTEMPTS,
      reconnectionDelay: 1000,
      timeout: 20000, // Increase timeout for better reliability
      forceNew: true, 
      autoConnect: true,
      reconnection: true,
      extraHeaders: {
        "Authorization": token ? `Bearer ${token}` : undefined
      },
      withCredentials: true, // Important for CORS
      // Additional Socket.IO options for better reliability
      path: '/socket.io', // Ensure this matches server-side path
      upgrade: true, // Allow transport upgrade
      rememberUpgrade: true,
      secure: false, // Set to true if using HTTPS
      rejectUnauthorized: false // For self-signed certificates
    });
    
    // Set up event listeners for connection
    socket.on('connect', async () => {
      console.log('Socket connected successfully:', socket.id);
      connectionAttempts = 0; // Reset attempts on successful connection
      reconnectionAbandoned = false;
      
      // Authenticate socket with user token for direct messaging
      if (token) {
        socket.emit('authenticate', token);
      }
      
      // Save the successful connection IP for future use
      const connectedIP = socketUrl.replace('http://', '').split(':')[0];
      if (connectedIP !== 'localhost' && connectedIP !== '127.0.0.1') {
        await setServerIP(connectedIP);
        console.log(`Saved successful connection IP: ${connectedIP}`);
      }
    });
    
    socket.on('connect_error', (error) => {
      connectionAttempts++;
      console.error(`Socket connection error (attempt ${connectionAttempts}/${MAX_RECONNECTION_ATTEMPTS}): ${error.message}`);
      
      if (connectionAttempts >= MAX_RECONNECTION_ATTEMPTS && !reconnectionAbandoned) {
        reconnectionAbandoned = true;
        console.log('Max connection attempts reached, stopping reconnection');
        socket.disconnect();
        
        // Only show alert if not on web
        if (Platform.OS !== 'web') {
          Alert.alert(
            'Connection Error',
            'Failed to connect to the server. Please check your network connection and server settings in Network Config.',
            [
              { 
                text: 'Try Again', 
                onPress: () => {
                  // Reset and try again with fresh discovery
                  reconnectionAbandoned = false;
                  connectionAttempts = 0;
                  initializeSocket();
                } 
              },
              { text: 'OK' }
            ]
          );
        }
      }
    });
    
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
    
    // Listen for authentication success/failure
    socket.on('authentication_success', (data) => {
      console.log('Socket authenticated successfully for user:', data.userId);
    });
    
    socket.on('authentication_error', (error) => {
      console.error('Socket authentication error:', error.message);
    });
    
    // Return the socket without waiting for connection
    return socket;
  } catch (error) {
    console.error('Error initializing socket:', error);
    return null;
  }
};

// Rest of the file unchanged
export const getSocket = () => {
  if (!socket) {
    console.warn('Socket not initialized. Call initializeSocket() first.');
    return null;
  }
  return socket;
};

// Function to safely handle event listeners and avoid null/undefined return values
const safeAddListener = (eventName, callback) => {
  if (!socket) {
    console.warn(`Socket not initialized. Cannot add listener for ${eventName}.`);
    return () => {}; // Return a no-op function instead of undefined
  }
  
  socket.on(eventName, callback);
  return () => {
    if (socket) {
      socket.off(eventName, callback);
    }
  };
};

// Function to send a direct message to another user
export const sendDirectMessage = (recipientId, text) => {
  if (!socket) {
    console.warn('Socket not initialized. Call initializeSocket() first.');
    return;
  }
  
  socket.emit('direct_message', {
    recipientId,
    text
  });
};

// Function to mark a message as read
export const markMessageAsRead = (messageId) => {
  if (!socket) {
    console.warn('Socket not initialized. Call initializeSocket() first.');
    return;
  }
  
  socket.emit('mark_read', messageId);
};

// Function to register a callback for receiving direct messages
export const onDirectMessage = (callback) => {
  return safeAddListener('direct_message', callback);
};

// Function to register a callback for message read status updates
export const onMessageRead = (callback) => {
  return safeAddListener('message_read', callback);
};

export const joinProjectRoom = (projectId) => {
  if (!socket) {
    console.warn('Socket not initialized. Call initializeSocket() first.');
    return;
  }
  
  socket.emit('join_project', projectId);
};

export const leaveProjectRoom = (projectId) => {
  if (!socket) {
    console.warn('Socket not initialized. Call initializeSocket() first.');
    return;
  }
  
  socket.emit('leave_project', projectId);
};

export const sendCollaborationUpdate = (data) => {
  if (!socket) {
    console.warn('Socket not initialized. Call initializeSocket() first.');
    return;
  }
  
  socket.emit('collaboration_update', data);
};

export const sendChatMessage = (projectId, message) => {
  if (!socket) {
    console.warn('Socket not initialized. Call initializeSocket() first.');
    return;
  }
  
  socket.emit('chat_message', {
    projectId,
    message,
    timestamp: new Date()
  });
};

// Community related socket functions
export const joinCommunityRoom = (communityId) => {
  if (!socket) {
    console.warn('Socket not initialized. Call initializeSocket() first.');
    return;
  }
  
  socket.emit('join_community', communityId);
};

export const leaveCommunityRoom = (communityId) => {
  if (!socket) {
    console.warn('Socket not initialized. Call initializeSocket() first.');
    return;
  }
  
  socket.emit('leave_community', communityId);
};

export const sendCommunityMessage = (communityId, message) => {
  if (!socket) {
    console.warn('Socket not initialized. Call initializeSocket() first.');
    return;
  }
  
  socket.emit('community_message', {
    communityId,
    message,
    timestamp: new Date()
  });
};

export const onCommunityMessage = (callback) => {
  return safeAddListener('community_message', callback);
};

// Event related socket functions
export const sendEventUpdate = (communityId, eventId, updateType, data) => {
  if (!socket) {
    console.warn('Socket not initialized. Call initializeSocket() first.');
    return;
  }
  
  socket.emit('event_update', {
    communityId,
    eventId,
    updateType, // 'created', 'updated', 'deleted', 'rsvp'
    data,
    timestamp: new Date()
  });
};

export const onEventUpdate = (callback) => {
  return safeAddListener('event_update', callback);
};

// Live Session socket functions
export const joinSessionRoom = (sessionId) => {
  if (!socket) {
    console.warn('Socket not initialized. Call initializeSocket() first.');
    return;
  }
  
  socket.emit('join_session', sessionId);
};

export const leaveSessionRoom = (sessionId) => {
  if (!socket) {
    console.warn('Socket not initialized. Call initializeSocket() first.');
    return;
  }
  
  socket.emit('leave_session', sessionId);
};

export const sendCodeUpdate = (sessionId, codeSnippet) => {
  if (!socket) {
    console.warn('Socket not initialized. Call initializeSocket() first.');
    return;
  }
  
  socket.emit('code_update', {
    sessionId,
    codeSnippet,
    timestamp: new Date()
  });
};

export const onCodeUpdate = (callback) => {
  return safeAddListener('code_update', callback);
};

export const sendSessionMessage = (sessionId, message) => {
  if (!socket) {
    console.warn('Socket not initialized. Call initializeSocket() first.');
    return;
  }
  
  socket.emit('session_message', {
    sessionId,
    message,
    timestamp: new Date()
  });
};

export const onSessionMessage = (callback) => {
  return safeAddListener('session_message', callback);
};

export const onParticipantJoined = (callback) => {
  return safeAddListener('participant_joined', callback);
};

export const onParticipantLeft = (callback) => {
  return safeAddListener('participant_left', callback);
};

export const onSessionUpdate = (callback) => {
  return safeAddListener('session_update', callback);
};

export const onProjectActivity = (callback) => {
  return safeAddListener('project_activity', callback);
};

// Function to remove all event listeners - safe to call even if socket is null
export const removeAllListeners = () => {
  if (!socket) {
    console.warn('Socket not initialized. No listeners to remove.');
    return;
  }
  
  // Remove all event listeners for common events
  const events = [
    'direct_message', 
    'message_read', 
    'community_message', 
    'event_update',
    'code_update', 
    'session_message', 
    'participant_joined', 
    'participant_left',
    'session_update', 
    'project_activity',
    'authentication_success',
    'authentication_error'
  ];
  
  events.forEach(event => {
    socket.removeAllListeners(event);
  });
  
  console.log('All socket event listeners removed.');
};

export const disconnectSocket = () => {
  if (socket) {
    // Remove listeners before disconnecting
    removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

// Get current server IP
export const getCurrentServerIP = async () => {
  // Try to get from API first if available
  const apiServerIP = getAPIServerIP();
  if (apiServerIP) {
    return apiServerIP;
  }
  
  // Otherwise get from storage
  const ip = await AsyncStorage.getItem('serverIP');
  return ip || '192.168.0.105'; // Default if not set
};

// Export all socket functions as a default object
const socketUtils = {
  initializeSocket,
  getSocket,
  setServerIP,
  getCurrentServerIP,
  joinProjectRoom,
  leaveProjectRoom,
  joinCommunityRoom,
  leaveCommunityRoom,
  joinSessionRoom,
  leaveSessionRoom,
  sendCollaborationUpdate,
  sendChatMessage,
  sendCommunityMessage,
  sendEventUpdate,
  sendDirectMessage,
  sendCodeUpdate,
  sendSessionMessage,
  markMessageAsRead,
  onDirectMessage,
  onMessageRead,
  onCommunityMessage,
  onEventUpdate,
  onCodeUpdate,
  onSessionMessage,
  onParticipantJoined,
  onParticipantLeft,
  onSessionUpdate,
  onProjectActivity,
  removeAllListeners,
  disconnectSocket
};

export default socketUtils;
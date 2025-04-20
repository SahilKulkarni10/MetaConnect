import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import NetworkDiagnostic from './networkDiagnostic';

// Enhanced server URL discovery using our improved network diagnostic tools
const getServerUrl = async () => {
  try {
    // First try to use our network discovery mechanism to find the server
    const discoveredServer = await NetworkDiagnostic.discoverServer();
    if (discoveredServer) {
      console.log(`Using discovered server at ${discoveredServer.ip}:${discoveredServer.port}`);
      return `http://${discoveredServer.ip}:${discoveredServer.port}/api`;
    }
    
    // If discovery fails, try saved server IP
    const savedServerIP = await AsyncStorage.getItem('serverIP');
    
    // Default values if no stored IP - get local IP from network info
    let serverIP = savedServerIP;
    if (!serverIP) {
      // Try to detect local network IP automatically
      const networkState = await NetInfo.fetch();
      if (networkState.details && networkState.details.ipAddress) {
        // Use device's IP as a base for guessing server IP in same network
        const deviceIP = networkState.details.ipAddress;
        // Extract network prefix from device IP (first 3 octets)
        const networkPrefix = deviceIP.split('.').slice(0, 3).join('.');
        
        // Try common local IPs in the same subnet
        // For development environments, localhost and 10.0.2.2 are common for emulators
        if (Platform.OS === 'android') {
          serverIP = '10.0.2.2'; // Android emulator default for localhost
        } else {
          // Prefer common server IPs in the network
          const commonIPs = [
            `${networkPrefix}.1`,   // Router
            `${networkPrefix}.100`, // Common server IP
            `${networkPrefix}.105`, // Current default
            `${networkPrefix}.110`  // Another common option
          ];
          
          // Test each IP in parallel and use the first one that responds
          const results = await Promise.all(
            commonIPs.map(ip => NetworkDiagnostic.testServerConnection(ip))
          );
          
          const workingServer = results.find(result => result.success);
          if (workingServer) {
            serverIP = workingServer.ip;
            await AsyncStorage.setItem('serverIP', serverIP);
            console.log(`Found working server at: ${serverIP}`);
          } else {
            // Fall back to router as best guess
            serverIP = `${networkPrefix}.1`;
          }
        }
        
        console.log(`Network: ${networkPrefix}, using server IP: ${serverIP}`);
      } else {
        // Fall back to default IP
        serverIP = '192.168.0.105';
      }
    }
    
    const serverPort = '50002';
    const apiPath = '/api';
    
    if (Platform.OS === 'web') {
      // For web development
      return `http://localhost:${serverPort}${apiPath}`;
    } else {
      // Special case for Android emulator
      if (Platform.OS === 'android' && serverIP === '10.0.2.2') {
        return `http://10.0.2.2:${serverPort}${apiPath}`;
      }
      // For iOS and Android, use the saved/default IP address
      return `http://${serverIP}:${serverPort}${apiPath}`;
    }
  } catch (error) {
    console.error('Error getting server URL:', error);
    return `http://192.168.0.105:50002/api`; // Fallback
  }
};

// Get base server URL (without /api) for socket connection
export const getBaseServerUrl = async () => {
  try {
    // First try to use our network discovery mechanism to find the server
    const discoveredServer = await NetworkDiagnostic.discoverServer();
    if (discoveredServer) {
      console.log(`Using discovered base server URL: ${discoveredServer.ip}:${discoveredServer.port}`);
      return `http://${discoveredServer.ip}:${discoveredServer.port}`;
    }
    
    // If that fails, try saved server IP
    const savedServerIP = await AsyncStorage.getItem('serverIP');
    const serverIP = savedServerIP || '192.168.0.105'; // Use saved IP or default
    const serverPort = '50002';
    
    if (Platform.OS === 'web') {
      // For web development
      return `http://localhost:${serverPort}`;
    } else if (Platform.OS === 'android' && !savedServerIP) {
      // Try Android emulator host if no saved IP
      const emulatorUrl = 'http://10.0.2.2:50002';
      const isHealthy = await NetworkDiagnostic.testServerConnection('10.0.2.2');
      if (isHealthy.success) {
        return emulatorUrl;
      }
    }
    
    // For iOS and Android, use the saved/default IP address
    return `http://${serverIP}:${serverPort}`;
  } catch (error) {
    console.error('Error getting base server URL:', error);
    return `http://192.168.0.105:50002`; // Fallback
  }
};

// Create a placeholder for the API_BASE_URL that will be initialized on first use
let _API_BASE_URL = null;

// Export the API base URL for use in other modules
export const API_BASE_URL = (() => {
  // If we don't have the URL yet, use the default
  if (!_API_BASE_URL) {
    return 'http://192.168.0.105:50002/api';
  }
  return _API_BASE_URL;
})();

// Initialize the API with a mutable config that can be updated
const api = axios.create({
  // We'll set the baseURL after initialization
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 20000 // Increased timeout to 20 seconds for better reliability
});

// Enhanced retry capability for network errors
api.interceptors.response.use(
  response => response,
  async error => {
    const { config } = error;
    
    // Only retry on network errors or timeouts
    if (!error.response && error.code !== 'ECONNABORTED' && !config._retry) {
      config._retry = true;
      console.log('Network error detected. Attempting to find a working server...');
      
      try {
        // Try to discover a working server
        const discoveredServer = await NetworkDiagnostic.discoverServer();
        if (discoveredServer) {
          // Update stored IP
          await AsyncStorage.setItem('serverIP', discoveredServer.ip);
          
          // Update API base URL
          const newApiUrl = `http://${discoveredServer.ip}:${discoveredServer.port}/api`;
          _API_BASE_URL = newApiUrl;
          api.defaults.baseURL = newApiUrl;
          
          console.log(`Found working server. Retrying request with new URL: ${newApiUrl}`);
          
          // Update the request URL and retry
          config.baseURL = newApiUrl;
          return axios(config);
        }
      } catch (retryError) {
        console.error('Error during retry attempt:', retryError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Function to initialize the API with the correct base URL
export const initializeAPI = async () => {
  try {
    const apiUrl = await getServerUrl();
    const baseUrl = await getBaseServerUrl();
    
    // Update the module-level API_BASE_URL value
    _API_BASE_URL = apiUrl;
    
    // Update axios instance base URL
    api.defaults.baseURL = apiUrl;
    
    console.log(`API initialized with base URL: ${apiUrl}`);
    console.log(`Base server URL: ${baseUrl}`);
    
    return { apiUrl, baseUrl };
  } catch (error) {
    console.error('Error initializing API:', error);
    
    // Use default values
    api.defaults.baseURL = 'http://192.168.0.105:50002/api';
    return { 
      apiUrl: 'http://192.168.0.105:50002/api', 
      baseUrl: 'http://192.168.0.105:50002' 
    };
  }
};

// Call initializeAPI on module load
initializeAPI().catch(error => {
  console.error('Failed to initialize API on module load:', error);
});

// Add authorization token to requests if available
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error retrieving auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Logging interceptor to help with debugging
api.interceptors.request.use(request => {
  console.log('Starting Request:', request.method, request.baseURL + request.url);
  return request;
});

api.interceptors.response.use(
  response => {
    console.log('Response Status:', response.status);
    return response;
  },
  error => {
    if (error.response) {
      console.error('Error Response:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('No Response:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Message related API calls
export const getConversations = async () => {
  try {
    const response = await api.get('/messages/conversations');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    // More detailed error logging to help with debugging
    if (error.response) {
      // The server responded with a status code outside the 2xx range
      console.error('Server error response:', error.response.data);
      console.error('Status code:', error.response.status);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    }
    throw error;
  }
};

export const getMessagesWithUser = async (userId) => {
  try {
    const response = await api.get(`/messages/${userId}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    // More detailed error logging
    if (error.response) {
      console.error('Server error response:', error.response.data);
      console.error('Status code:', error.response.status);
    }
    throw error;
  }
};

export const sendMessage = async (userId, text) => {
  try {
    const response = await api.post(`/messages/${userId}`, { text });
    return response.data.data;
  } catch (error) {
    console.error('Error sending message:', error);
    // More detailed error logging
    if (error.response) {
      console.error('Server error response:', error.response.data);
      console.error('Status code:', error.response.status);
    }
    throw error;
  }
};

// Community related API calls
export const getAllCommunities = async () => {
  try {
    const response = await api.get('/communities');
    return response.data;
  } catch (error) {
    console.error('Error fetching communities:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
      console.error('Status code:', error.response.status);
    }
    throw error;
  }
};

export const getCommunityById = async (communityId) => {
  try {
    const response = await api.get(`/communities/${communityId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching community details:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export const createCommunity = async (communityData) => {
  try {
    const response = await api.post('/communities', communityData);
    return response.data;
  } catch (error) {
    console.error('Error creating community:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export const updateCommunity = async (communityId, updateData) => {
  try {
    const response = await api.put(`/communities/${communityId}`, updateData);
    return response.data;
  } catch (error) {
    console.error('Error updating community:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export const deleteCommunity = async (communityId) => {
  try {
    const response = await api.delete(`/communities/${communityId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting community:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export const joinCommunity = async (communityId) => {
  try {
    const response = await api.put(`/communities/${communityId}/join`);
    return response.data;
  } catch (error) {
    console.error('Error joining community:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export const leaveCommunity = async (communityId) => {
  try {
    const response = await api.put(`/communities/${communityId}/leave`);
    return response.data;
  } catch (error) {
    console.error('Error leaving community:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export const getUserCommunities = async (userId) => {
  try {
    const response = await api.get(`/communities/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user communities:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

// Event related API calls
export const getAllEvents = async () => {
  try {
    const response = await api.get('/events');
    return response.data;
  } catch (error) {
    console.error('Error fetching events:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export const getEventById = async (eventId) => {
  try {
    const response = await api.get(`/events/${eventId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching event details:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export const createEvent = async (eventData) => {
  try {
    const response = await api.post('/events', eventData);
    return response.data;
  } catch (error) {
    console.error('Error creating event:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export const updateEvent = async (eventId, updateData) => {
  try {
    const response = await api.put(`/events/${eventId}`, updateData);
    return response.data;
  } catch (error) {
    console.error('Error updating event:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export const deleteEvent = async (eventId) => {
  try {
    const response = await api.delete(`/events/${eventId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting event:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export const rsvpEvent = async (eventId) => {
  try {
    const response = await api.put(`/events/${eventId}/rsvp`);
    return response.data;
  } catch (error) {
    console.error('Error RSVP to event:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export const getCommunityEvents = async (communityId) => {
  try {
    const response = await api.get(`/events/community/${communityId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching community events:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export const getUserEvents = async (userId) => {
  try {
    const response = await api.get(`/events/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user events:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

// Profile related API calls
export const getCurrentProfile = async () => {
  try {
    const response = await api.get('/profile/me');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export const updateProfile = async (profileData) => {
  try {
    const response = await api.put('/profile/me', profileData);
    return response.data.data;
  } catch (error) {
    console.error('Error updating profile:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export const getDashboardData = async () => {
  try {
    const response = await api.get('/profile/dashboard');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export const getUserStats = async () => {
  try {
    const response = await api.get('/profile/stats');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

// Collaborate - Projects API calls
export const getUserProjects = async () => {
  try {
    const response = await api.get('/projects');
    return response.data;
  } catch (error) {
    console.error('Error fetching user projects:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

// Collaborate - Activities API calls
export const getAllActivities = async (page = 1, limit = 20) => {
  try {
    const response = await api.get(`/collaborate/activities?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching collaborate data:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export const getProjectActivities = async (projectId, page = 1, limit = 20) => {
  try {
    const response = await api.get(`/collaborate/activities/project/${projectId}?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching project activities:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export const createActivity = async (activityData) => {
  try {
    const response = await api.post('/collaborate/activities', activityData);
    return response.data;
  } catch (error) {
    console.error('Error creating activity:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export const getProjectStats = async (projectId) => {
  try {
    const response = await api.get(`/collaborate/activities/stats/${projectId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching project stats:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

// Collaborate - Live Sessions API calls
export const getAllSessions = async (status) => {
  try {
    const query = status ? `?status=${status}` : '';
    const response = await api.get(`/collaborate/sessions${query}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching live sessions:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export const getLiveSessions = async () => {
  try {
    const response = await api.get('/collaborate/sessions/live');
    return response.data;
  } catch (error) {
    console.error('Error fetching live sessions:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export const getSessionById = async (sessionId) => {
  try {
    const response = await api.get(`/collaborate/sessions/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching session details:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export const createSession = async (sessionData) => {
  try {
    const response = await api.post('/collaborate/sessions', sessionData);
    return response.data;
  } catch (error) {
    console.error('Error creating session:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export const updateSessionStatus = async (sessionId, status) => {
  try {
    const response = await api.put(`/collaborate/sessions/${sessionId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error('Error updating session status:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export const updateCodeSnippet = async (sessionId, codeSnippet) => {
  try {
    const response = await api.put(`/collaborate/sessions/${sessionId}/code`, { codeSnippet });
    return response.data;
  } catch (error) {
    console.error('Error updating code snippet:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export const joinSession = async (sessionId) => {
  try {
    const response = await api.put(`/collaborate/sessions/${sessionId}/join`);
    return response.data;
  } catch (error) {
    console.error('Error joining session:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export const leaveSession = async (sessionId) => {
  try {
    const response = await api.put(`/collaborate/sessions/${sessionId}/leave`);
    return response.data;
  } catch (error) {
    console.error('Error leaving session:', error);
    if (error.response) {
      console.error('Server error response:', error.response.data);
    }
    throw error;
  }
};

export default api;
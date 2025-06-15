import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { checkDeviceConnectivity, discoverServer } from './networkDiagnostic';

// Create axios instance with custom config
const api = axios.create({
  baseURL: 'http://192.168.0.159:50002/api', // Updated to correct server IP
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  validateStatus: status => status >= 200 && status < 500
});

// Initialize the API with health check
export const initializeAPI = async () => {
  try {
    const serverIP = await AsyncStorage.getItem('serverIP');
    if (serverIP) {
      api.defaults.baseURL = `http://${serverIP}:50002/api`;
    }
    
    const healthURL = api.defaults.baseURL.replace('/api', '/health');
    console.log('Testing connection to server:', healthURL);
    
    const response = await axios.get(healthURL, { timeout: 5000 });
    if (response.status === 200) {
      console.log('Successfully connected to server');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error connecting to server:', error.message);
    return false;
  }
};

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    try {
      const connectivity = await checkDeviceConnectivity();
      if (!connectivity.isConnected) {
        throw new Error('No network connection available');
      }

      // Add auth token if available
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      console.log('Starting Request:', config.method?.toUpperCase(), api.defaults.baseURL + config.url);
      return config;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('Response received:', response.status);
    return response;
  },
  async (error) => {
    let errorMessage = 'An unexpected error occurred';

    if (error.message === 'Network Error') {
      // Try to get more specific network error information
      const connectivity = await checkDeviceConnectivity();
      if (!connectivity.isConnected) {
        errorMessage = 'No network connection available. Please check your internet connection.';
      } else {
        errorMessage = `Network error: Could not connect to server at ${api.defaults.baseURL}. Please check if the server is running.`;
      }
    } else if (error.response) {
      // Server responded with error
      errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
    } else if (error.request) {
      // Request was made but no response received
      errorMessage = 'No response received from server. Please check your connection and try again.';
    }

    // Enhance error object with additional context
    const enhancedError = {
      ...error,
      message: errorMessage,
      originalError: error.message,
      timestamp: new Date().toISOString(),
      networkInfo: await checkDeviceConnectivity(),
      serverUrl: api.defaults.baseURL
    };

    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: errorMessage,
      networkInfo: enhancedError.networkInfo
    });

    return Promise.reject(enhancedError);
  }
);

export default api;

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
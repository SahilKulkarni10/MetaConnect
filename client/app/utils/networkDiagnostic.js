import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_PORT = '50002';
const SERVER_IP_KEY = '@server_ip';
const NETWORK_PROFILES_KEY = '@network_profiles';

// Get the appropriate localhost URL for the current platform
export const getLastKnownIP = async () => {
  try {
    if (Platform.OS === 'web') {
      return 'localhost';
    }
    if (Platform.OS === 'android') {
      return '10.0.2.2'; // Special IP for Android emulator localhost
    }
    return '127.0.0.1'; // For iOS
  } catch {
    return Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
  }
};

// Helper to test a single IP address
const testIP = async (ip, port = DEFAULT_PORT, timeout = 5000) => {
  try {
    const url = `http://${ip}:${port}/health`;
    console.log(`Testing connection to: ${url}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    if (response.ok) {
      return { success: true, ip };
    }
  } catch (error) {
    console.log(`Connection failed to ${ip}: ${error.message}`);
  }
  return { success: false };
};

// Add exponential backoff retry logic
const retryWithBackoff = async (fn, maxAttempts = 3, initialDelay = 1000) => {
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt === maxAttempts) throw error;
      const delay = initialDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Function to get local network IP addresses
const getLocalNetworkIPs = async () => {
  try {
    const netInfo = await NetInfo.fetch();
    const ips = [];
    
    // Add the default IPs first
    const defaultIP = await getLastKnownIP();
    ips.push(defaultIP);
    
    // If on WiFi, try to use the gateway IP subnet
    if (netInfo.type === 'wifi' && netInfo.details?.ipAddress && netInfo.details?.subnet) {
      const ipParts = netInfo.details.ipAddress.split('.');
      // Try the same subnet as the device
      for (let i = 1; i < 255; i++) {
        ips.push(`${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.${i}`);
      }
    }
    
    return ips;
  } catch (error) {
    console.error('Error getting local network IPs:', error);
    return [await getLastKnownIP()];
  }
};

// Function to save network profile
export const saveNetworkProfile = async (serverIP) => {
  try {
    const netInfo = await NetInfo.fetch();
    if (netInfo.type === 'wifi' && netInfo.details?.ssid) {
      const ssid = netInfo.details.ssid;
      
      // Load existing profiles
      const profilesJson = await AsyncStorage.getItem(NETWORK_PROFILES_KEY);
      const profiles = profilesJson ? JSON.parse(profilesJson) : {};
      
      // Update profile for current network
      profiles[ssid] = {
        serverIP,
        lastUsed: Date.now(),
        networkInfo: {
          ssid,
          ipAddress: netInfo.details.ipAddress,
          subnet: netInfo.details.subnet
        }
      };
      
      // Save updated profiles
      await AsyncStorage.setItem(NETWORK_PROFILES_KEY, JSON.stringify(profiles));
      console.log(`Saved network profile for ${ssid}`);
      
      // Also update current serverIP
      await AsyncStorage.setItem(SERVER_IP_KEY, serverIP);
    }
    return true;
  } catch (error) {
    console.error('Error saving network profile:', error);
    return false;
  }
};

// Function to load network profile for current network
export const loadNetworkProfile = async () => {
  try {
    const netInfo = await NetInfo.fetch();
    if (netInfo.type === 'wifi' && netInfo.details?.ssid) {
      const ssid = netInfo.details.ssid;
      const profilesJson = await AsyncStorage.getItem(NETWORK_PROFILES_KEY);
      const profiles = profilesJson ? JSON.parse(profilesJson) : {};
      
      if (profiles[ssid]) {
        console.log(`Found saved profile for network: ${ssid}`);
        return profiles[ssid];
      }
    }
    return null;
  } catch (error) {
    console.error('Error loading network profile:', error);
    return null;
  }
};

// Enhanced server discovery with network profiles
export const discoverServer = async () => {
  try {
    // First check if we're on a known WiFi network
    const netInfo = await NetInfo.fetch();
    if (netInfo.type === 'wifi' && netInfo.details?.ssid) {
      // Try to load saved profile for this network
      const profile = await loadNetworkProfile();
      if (profile) {
        const testResult = await testIP(profile.serverIP);
        if (testResult.success) {
          await AsyncStorage.setItem(SERVER_IP_KEY, profile.serverIP);
          return { ip: profile.serverIP, port: DEFAULT_PORT };
        }
      }
    }

    // If no profile or profile failed, scan network
    console.log('Scanning local network for server...');
    const localIPs = await getLocalNetworkIPs();
    
    // Test IPs in parallel for faster discovery
    const testPromises = localIPs.map(ip => testIP(ip));
    const results = await Promise.all(testPromises);
    const successfulResult = results.find(result => result.success);
    
    if (successfulResult) {
      // Save network profile and current IP
      await saveNetworkProfile(successfulResult.ip);
      return { ip: successfulResult.ip, port: DEFAULT_PORT };
    }

    console.log('No server found on local network');
    return null;
  } catch (error) {
    console.error('Error in server discovery:', error);
    return null;
  }
};

// Function to test server connection
export const testServerConnection = async (ip, port = DEFAULT_PORT, timeout = 8000) => {
  try {
    if (!ip) {
      ip = await getLastKnownIP();
    }
    
    const result = await testIP(ip, port, timeout);
    if (result.success) {
      return {
        success: true,
        ip,
        port
      };
    }
    
    // If the main IP fails and we're on iOS, try literal localhost
    if (Platform.OS === 'ios' && ip !== 'localhost') {
      const localhostResult = await testIP('localhost', port, timeout);
      if (localhostResult.success) {
        return {
          success: true,
          ip: 'localhost',
          port
        };
      }
    }
    
    return {
      success: false,
      message: `Could not connect to server at ${ip}:${port}`
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
};

// Function to check basic device network connectivity
export const checkDeviceConnectivity = async () => {
  try {
    const state = await NetInfo.fetch();
    return {
      isConnected: state.isConnected,
      type: state.type,
      details: state.details || {}
    };
  } catch (error) {
    console.error('Error checking connectivity:', error);
    return {
      isConnected: false,
      error: error.message
    };
  }
};

// Function to suggest possible server IPs for the current platform
export const suggestServerIPs = async () => {
  const suggestions = [];
  
  if (Platform.OS === 'android') {
    suggestions.push({
      ip: '10.0.2.2',
      description: 'Android Emulator (localhost)'
    });
  } else if (Platform.OS === 'ios') {
    suggestions.push(
      {
        ip: '127.0.0.1',
        description: 'iOS Simulator (localhost)'
      },
      {
        ip: 'localhost',
        description: 'iOS Alternative localhost'
      }
    );
  } else {
    suggestions.push({
      ip: 'localhost',
      description: 'Web Browser (localhost)'
    });
  }

  return suggestions;
};

// Function to save working IP address
export const saveWorkingIP = async (ip) => {
  try {
    await AsyncStorage.setItem(SERVER_IP_KEY, ip);
    console.log(`Saved working IP: ${ip}`);
    return true;
  } catch (error) {
    console.error('Error saving working IP:', error);
    return false;
  }
};

// Export all functions
export default {
  discoverServer,
  testServerConnection,
  checkDeviceConnectivity,
  suggestServerIPs,
  getLastKnownIP,
  saveWorkingIP,
  loadNetworkProfile,
  saveNetworkProfile
};
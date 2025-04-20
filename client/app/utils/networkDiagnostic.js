import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Function to check basic device network connectivity
export const checkDeviceConnectivity = async () => {
  try {
    const state = await NetInfo.fetch();
    
    return {
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      networkType: state.type,
      details: state.details || {},
      deviceIP: state.details?.ipAddress
    };
  } catch (error) {
    console.error('Error checking device connectivity:', error);
    return {
      isConnected: false,
      isInternetReachable: false,
      error: error.message
    };
  }
};

// Function to test connection to a specific server IP and port with better error handling
export const testServerConnection = async (serverIP, port = '50002', endpoint = '/health', timeout = 8000) => {
  try {
    console.log(`Testing connection to: http://${serverIP}:${port}${endpoint}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(`http://${serverIP}:${port}${endpoint}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          status: response.status,
          data,
          ip: serverIP,
          port
        };
      } else {
        return {
          success: false,
          status: response.status,
          message: `Server returned status: ${response.status}`,
          ip: serverIP,
          port
        };
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        return {
          success: false,
          message: `Connection to ${serverIP}:${port} timed out after ${timeout}ms`,
          error: 'timeout',
          ip: serverIP,
          port
        };
      }
      
      return {
        success: false,
        message: `Connection to ${serverIP}:${port} failed: ${fetchError.message}`,
        error: fetchError.message,
        ip: serverIP,
        port
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Error testing ${serverIP}:${port}: ${error.message}`,
      error: error.message,
      ip: serverIP,
      port
    };
  }
};

// Scan a single IP across multiple ports
export const scanPorts = async (ip, ports = ['50002', '50001', '50000', '8080', '3000']) => {
  const results = [];
  const promises = ports.map(port => testServerConnection(ip, port));
  const responses = await Promise.all(promises);
  
  return responses.filter(res => res.success);
};

// Function to discover server by scanning local subnet
export const discoverServer = async () => {
  try {
    const state = await NetInfo.fetch();
    const results = [];
    
    // First try saved IP
    const savedIP = await AsyncStorage.getItem('serverIP');
    if (savedIP) {
      const result = await testServerConnection(savedIP);
      if (result.success) {
        console.log(`Successfully connected to saved server IP: ${savedIP}`);
        return { ip: savedIP, port: '50002' };
      }
    }
    
    // Check local loopback and emulator addresses first
    if (Platform.OS === 'android') {
      const emulatorResult = await testServerConnection('10.0.2.2');
      if (emulatorResult.success) {
        return { ip: '10.0.2.2', port: '50002' };
      }
    } else if (Platform.OS === 'ios') {
      const localhostResult = await testServerConnection('localhost');
      if (localhostResult.success) {
        return { ip: 'localhost', port: '50002' };
      }
    }
    
    // Otherwise scan subnet if we have a device IP
    if (state.details && state.details.ipAddress) {
      const deviceIP = state.details.ipAddress;
      const ipParts = deviceIP.split('.');
      
      if (ipParts.length >= 3) {
        const networkPrefix = ipParts.slice(0, 3).join('.');
        
        // Try common IPs first for faster discovery
        const commonLastOctets = [1, 100, 105, 110, 120];
        for (const lastOctet of commonLastOctets) {
          const ip = `${networkPrefix}.${lastOctet}`;
          if (ip !== deviceIP) { // Skip device's own IP
            const result = await testServerConnection(ip);
            if (result.success) {
              return { ip, port: '50002' };
            }
          }
        }
      }
    }
    
    // If we got here, we couldn't find the server
    return null;
  } catch (error) {
    console.error('Error discovering server:', error);
    return null;
  }
};

// Function to suggest potential server IPs based on the device's network
export const suggestServerIPs = async () => {
  try {
    const state = await NetInfo.fetch();
    const suggestions = [];
    
    // Already saved server IP
    const savedIP = await AsyncStorage.getItem('serverIP');
    if (savedIP) {
      suggestions.push({
        ip: savedIP,
        description: 'Previously configured server IP'
      });
    }
    
    // Use device IP to guess local network
    if (state.details && state.details.ipAddress) {
      const deviceIP = state.details.ipAddress;
      suggestions.push({
        ip: deviceIP,
        description: 'This device (if running server locally)'
      });
      
      // Extract network prefix
      const ipParts = deviceIP.split('.');
      if (ipParts.length >= 3) {
        const networkPrefix = ipParts.slice(0, 3).join('.');
        
        // Common local IPs
        suggestions.push({
          ip: `${networkPrefix}.1`,
          description: 'Typical router address'
        });
        
        // Common server IPs
        [100, 105, 110, 120].forEach(lastOctet => {
          if (`${networkPrefix}.${lastOctet}` !== deviceIP) {
            suggestions.push({
              ip: `${networkPrefix}.${lastOctet}`,
              description: 'Potential server on local network'
            });
          }
        });
      }
    }
    
    // Add localhost for completeness if on emulator
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      suggestions.push({
        ip: '127.0.0.1',
        description: 'Local loopback (emulator only)'
      });
      
      suggestions.push({
        ip: '10.0.2.2',
        description: 'Android emulator host'
      });
      
      suggestions.push({
        ip: '10.0.3.2',
        description: 'Android Genymotion host'
      });
    }
    
    return suggestions;
  } catch (error) {
    console.error('Error generating server IP suggestions:', error);
    return [];
  }
};

// Run comprehensive network diagnostics
export const runNetworkDiagnostics = async () => {
  try {
    const results = {
      deviceConnectivity: await checkDeviceConnectivity(),
      serverTests: [],
      suggestedIPs: await suggestServerIPs(),
      discoveryResults: await discoverServer()
    };
    
    // Test all suggested IPs
    for (const suggestion of results.suggestedIPs) {
      const testResult = await testServerConnection(suggestion.ip);
      results.serverTests.push({
        ip: suggestion.ip,
        description: suggestion.description,
        ...testResult
      });
    }
    
    return results;
  } catch (error) {
    console.error('Error running network diagnostics:', error);
    return {
      error: error.message,
      deviceConnectivity: await checkDeviceConnectivity()
    };
  }
};

// Default export for React component usage
const NetworkDiagnostic = {
  checkDeviceConnectivity,
  testServerConnection,
  suggestServerIPs,
  runNetworkDiagnostics,
  discoverServer,
  scanPorts
};

export default NetworkDiagnostic;
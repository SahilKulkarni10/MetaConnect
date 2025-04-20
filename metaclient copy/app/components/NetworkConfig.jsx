import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert, ActivityIndicator, ScrollView, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { setServerIP, getCurrentServerIP, initializeSocket, disconnectSocket } from '../utils/socket';
import { initializeAPI } from '../utils/api';
import NetInfo from '@react-native-community/netinfo';
import { runNetworkDiagnostics, testServerConnection, suggestServerIPs } from '../utils/networkDiagnostic';

const NetworkConfig = ({ visible, onClose }) => {
  const [serverIP, setServerIPState] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [diagnosticResults, setDiagnosticResults] = useState(null);
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false);
  const [suggestedIPs, setSuggestedIPs] = useState([]);
  
  useEffect(() => {
    // Load the saved server IP and network info when component mounts
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Get saved server IP
        const savedIP = await getCurrentServerIP();
        setServerIPState(savedIP);
        
        // Get network info
        const netInfo = await NetInfo.fetch();
        setNetworkInfo(netInfo);
        
        // Get IP suggestions
        const suggestions = await suggestServerIPs();
        setSuggestedIPs(suggestions);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (visible) {
      loadData();
    }
  }, [visible]);
  
  const testConnection = async () => {
    if (!serverIP || !serverIP.trim()) {
      Alert.alert('Invalid IP', 'Please enter a valid IP address');
      return;
    }
    
    setIsLoading(true);
    setTestResult(null);
    
    try {
      const result = await testServerConnection(serverIP.trim());
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: `Connection test failed: ${error.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const runDiagnostics = async () => {
    setIsDiagnosticRunning(true);
    setDiagnosticResults(null);
    
    try {
      const results = await runNetworkDiagnostics();
      setDiagnosticResults(results);
      
      // Find the first working server
      const workingServer = results.serverTests.find(test => test.success);
      if (workingServer) {
        Alert.alert(
          'Server Found',
          `Found a working server at ${workingServer.ip}. Would you like to use this server?`,
          [
            { text: 'No', style: 'cancel' },
            { 
              text: 'Yes', 
              onPress: () => {
                setServerIPState(workingServer.ip);
                setTestResult({
                  success: true,
                  message: `Connection to ${workingServer.ip} verified!`,
                  data: workingServer.data
                });
              } 
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error running diagnostics:', error);
      Alert.alert('Diagnostic Error', `Error running network diagnostics: ${error.message}`);
    } finally {
      setIsDiagnosticRunning(false);
    }
  };
  
  const handleSave = async () => {
    if (!serverIP || !serverIP.trim()) {
      Alert.alert('Invalid IP', 'Please enter a valid IP address');
      return;
    }
    
    setIsLoading(true);
    try {
      // First test connection to this IP
      try {
        const testResult = await testServerConnection(serverIP.trim());
        console.log(`Testing connection before save: http://${serverIP.trim()}:50002/health`);
        
        if (testResult.success) {
          // Save the IP
          const success = await setServerIP(serverIP.trim());
          
          if (success) {
            // Clean up existing connections
            disconnectSocket();
            
            // Re-initialize API and socket with new server IP
            await initializeAPI();
            
            // Show success message
            Alert.alert(
              'Success', 
              'Server IP updated successfully. Please restart the app for changes to take effect.',
              [{ text: 'OK', onPress: onClose }]
            );
          } else {
            Alert.alert('Error', 'Failed to save server IP');
          }
        } else {
          // Server responded but with an error
          Alert.alert(
            'Warning', 
            `${testResult.message}. The server might not be configured correctly.`,
            [
              { text: 'Try Again', style: 'cancel' }, 
              { 
                text: 'Save Anyway', 
                onPress: async () => {
                  const success = await setServerIP(serverIP.trim());
                  if (success) {
                    await initializeAPI();
                    onClose();
                  }
                } 
              }
            ]
          );
        }
      } catch (error) {
        // Connection error - could not connect to server
        Alert.alert(
          'Warning', 
          `Could not connect to the server: ${error.message}. Make sure the server is running at this IP address.`,
          [
            { text: 'Try Again', style: 'cancel' }, 
            { 
              text: 'Save Anyway', 
              onPress: async () => {
                const success = await setServerIP(serverIP.trim());
                if (success) {
                  await initializeAPI();
                  onClose();
                }
              } 
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error saving server IP:', error);
      Alert.alert('Error', 'An error occurred while saving server IP');
    } finally {
      setIsLoading(false);
    }
  };
  
  const selectSuggestedIP = (ip) => {
    setServerIPState(ip);
  };
  
  const renderIPSuggestion = ({ item }) => {
    const isCurrentIP = item.ip === serverIP;
    return (
      <TouchableOpacity 
        style={[styles.suggestionItem, isCurrentIP && styles.selectedSuggestion]} 
        onPress={() => selectSuggestedIP(item.ip)}
      >
        <View style={styles.suggestionContent}>
          <Text style={styles.ipText}>{item.ip}</Text>
          <Text style={styles.descriptionText}>{item.description}</Text>
        </View>
        {isCurrentIP && (
          <Ionicons name="checkmark-circle" size={20} color="#10b981" />
        )}
      </TouchableOpacity>
    );
  };
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.header}>
            <Text style={styles.modalTitle}>Network Configuration</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.scrollContent}>
            {/* Network Status */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Network Status</Text>
              {networkInfo ? (
                <View style={styles.infoContainer}>
                  <Text style={styles.infoText}>
                    <Text style={styles.infoLabel}>Connected: </Text>
                    <Text style={networkInfo.isConnected ? styles.statusGood : styles.statusBad}>
                      {networkInfo.isConnected ? 'Yes' : 'No'}
                    </Text>
                  </Text>
                  
                  <Text style={styles.infoText}>
                    <Text style={styles.infoLabel}>Internet: </Text>
                    <Text style={networkInfo.isInternetReachable ? styles.statusGood : styles.statusBad}>
                      {networkInfo.isInternetReachable ? 'Available' : 'Unavailable'}
                    </Text>
                  </Text>
                  
                  <Text style={styles.infoText}>
                    <Text style={styles.infoLabel}>Type: </Text>
                    {networkInfo.type}
                  </Text>
                  
                  {networkInfo.details && networkInfo.details.ipAddress && (
                    <Text style={styles.infoText}>
                      <Text style={styles.infoLabel}>Device IP: </Text>
                      {networkInfo.details.ipAddress}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.loadingText}>Loading network information...</Text>
              )}
            </View>
            
            {/* Suggested IPs */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Suggested Server IPs</Text>
              <Text style={styles.helpText}>
                Tap on a suggestion to use that IP address:
              </Text>
              
              {suggestedIPs.length > 0 ? (
                <FlatList
                  data={suggestedIPs}
                  renderItem={renderIPSuggestion}
                  keyExtractor={(item) => item.ip}
                  style={styles.suggestionList}
                  scrollEnabled={false}
                />
              ) : (
                <Text style={styles.loadingText}>No suggestions available</Text>
              )}
              
              <TouchableOpacity
                style={[styles.diagButton, isDiagnosticRunning && styles.disabledButton]}
                onPress={runDiagnostics}
                disabled={isDiagnosticRunning}
              >
                {isDiagnosticRunning ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="search" size={16} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.testButtonText}>Auto-Detect Server</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            
            {/* Server Configuration */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Server Configuration</Text>
              <Text style={styles.label}>Server IP Address:</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={serverIP}
                  onChangeText={setServerIPState}
                  placeholder="Enter server IP (e.g., 192.168.1.100)"
                  keyboardType="numeric"
                  autoCapitalize="none"
                  editable={!isLoading}
                />
              </View>
              
              <Text style={styles.portText}>Port: 50002 (fixed)</Text>
              
              <TouchableOpacity
                style={[styles.testButton, isLoading && styles.disabledButton]}
                onPress={testConnection}
                disabled={isLoading || !serverIP}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="speedometer-outline" size={16} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.testButtonText}>Test Connection</Text>
                  </>
                )}
              </TouchableOpacity>
              
              {testResult && (
                <View style={[
                  styles.testResultContainer, 
                  testResult.success ? styles.successContainer : styles.errorContainer
                ]}>
                  <Ionicons 
                    name={testResult.success ? "checkmark-circle-outline" : "alert-circle-outline"} 
                    size={20} 
                    color={testResult.success ? "#10b981" : "#ef4444"} 
                  />
                  <Text style={[
                    styles.testResultText,
                    testResult.success ? styles.successText : styles.errorText
                  ]}>
                    {testResult.message}
                  </Text>
                </View>
              )}
            </View>
            
            {/* Diagnostic Results */}
            {diagnosticResults && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Diagnostic Results</Text>
                
                <Text style={styles.subSectionTitle}>Server Tests:</Text>
                {diagnosticResults.serverTests.map((test, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.diagnosticResult, 
                      test.success ? styles.successContainer : styles.errorContainer
                    ]}
                  >
                    <Text style={styles.diagIpText}>{test.ip}</Text>
                    <Text style={styles.diagDescText}>{test.description}</Text>
                    <Text style={[
                      styles.diagStatusText,
                      test.success ? styles.successText : styles.errorText
                    ]}>
                      {test.success ? 'Connected' : test.message}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            
            <Text style={styles.helpText}>
              If you're experiencing connection issues, make sure the IP address matches your backend server's IP address.
              After changing the IP, you'll need to restart the app for all components to use the new server.
            </Text>
          </ScrollView>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.buttonCancel]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.buttonSave, isLoading && styles.disabledButton]}
              onPress={handleSave}
              disabled={isLoading || !serverIP}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalView: {
    width: '90%',
    maxHeight: '90%',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingTop: 15,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10
  },
  closeButton: {
    padding: 5
  },
  scrollContent: {
    maxHeight: '85%',
    paddingHorizontal: 20
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#374151'
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#4b5563'
  },
  infoContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    padding: 10
  },
  infoText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#4b5563'
  },
  infoLabel: {
    fontWeight: 'bold',
    color: '#374151'
  },
  statusGood: {
    color: '#10b981',
    fontWeight: '500'
  },
  statusBad: {
    color: '#ef4444',
    fontWeight: '500'
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827'
  },
  label: {
    fontSize: 15,
    marginBottom: 5,
    fontWeight: '500',
    color: '#374151'
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 10,
    borderRadius: 6,
    fontSize: 16,
    backgroundColor: '#fff'
  },
  suggestionList: {
    marginVertical: 8,
    maxHeight: 200
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8
  },
  selectedSuggestion: {
    backgroundColor: '#e0f2fe'
  },
  suggestionContent: {
    flex: 1
  },
  ipText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151'
  },
  descriptionText: {
    fontSize: 12,
    color: '#6b7280'
  },
  portText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 15
  },
  testButton: {
    backgroundColor: '#4f46e5',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10
  },
  diagButton: {
    backgroundColor: '#0ea5e9',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    borderRadius: 6,
    marginVertical: 10
  },
  buttonIcon: {
    marginRight: 6
  },
  testButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14
  },
  testResultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 6,
    marginBottom: 5
  },
  diagnosticResult: {
    padding: 10,
    borderRadius: 6,
    marginBottom: 6
  },
  diagIpText: {
    fontWeight: '600',
    fontSize: 14
  },
  diagDescText: {
    fontSize: 12,
    marginBottom: 2,
    color: '#4b5563'
  },
  diagStatusText: {
    fontSize: 12,
    fontWeight: '500'
  },
  successContainer: {
    backgroundColor: '#ecfdf5',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
  },
  testResultText: {
    marginLeft: 6,
    fontSize: 14,
    flex: 1
  },
  successText: {
    color: '#10b981',
  },
  errorText: {
    color: '#ef4444',
  },
  helpText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    paddingHorizontal: 20
  },
  button: {
    padding: 12,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center'
  },
  buttonCancel: {
    backgroundColor: '#e5e7eb'
  },
  buttonSave: {
    backgroundColor: '#3b82f6'
  },
  disabledButton: {
    opacity: 0.6
  },
  buttonText: {
    fontWeight: 'bold',
    color: '#fff'
  }
});

export default NetworkConfig;
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import NetworkDiagnostic from '../utils/networkDiagnostic';
import { initializeAPI } from '../utils/api';
import { colors, spacing } from '../constants/theme';

const NetworkConfig = ({ visible, onClose }) => {
  const [serverIP, setServerIP] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [networkInfo, setNetworkInfo] = useState(null);

  useEffect(() => {
    loadCurrentIP();
    loadSuggestions();
    loadNetworkInfo();
  }, [visible]);

  const loadNetworkInfo = async () => {
    const netInfo = await NetInfo.fetch();
    setNetworkInfo(netInfo);
  };

  const loadCurrentIP = async () => {
    try {
      // Try to load profile for current network first
      const profile = await NetworkDiagnostic.loadNetworkProfile();
      if (profile) {
        setServerIP(profile.serverIP);
        const result = await NetworkDiagnostic.testServerConnection(profile.serverIP);
        setTestStatus(result.success ? 'connected' : 'disconnected');
        return;
      }

      // Fallback to last known IP
      const currentIP = await NetworkDiagnostic.getLastKnownIP();
      setServerIP(currentIP);
      
      // Test current connection
      if (currentIP) {
        const result = await NetworkDiagnostic.testServerConnection(currentIP);
        setTestStatus(result.success ? 'connected' : 'disconnected');
      }
    } catch (error) {
      console.error('Error loading current IP:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const ipSuggestions = await NetworkDiagnostic.suggestServerIPs();
      setSuggestions(ipSuggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const handleSuggestionPress = async (suggestion) => {
    setServerIP(suggestion.ip);
    await testConnection(suggestion.ip);
  };

  const testConnection = async (ip = serverIP) => {
    try {
      setIsLoading(true);
      setTestStatus('testing');
      
      console.log(`Testing connection to server at ${ip}...`);
      const result = await NetworkDiagnostic.testServerConnection(ip);
      
      setTestStatus(result.success ? 'connected' : 'disconnected');
      
      if (result.success) {
        console.log('Connection successful');
      } else {
        console.log('Connection failed:', result.message);
        Alert.alert('Connection Failed', result.message);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setTestStatus('error');
      Alert.alert('Error', 'Failed to test connection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // Test connection one last time
      const result = await NetworkDiagnostic.testServerConnection(serverIP);
      
      if (result.success) {
        // Save to network profile and update current IP
        await NetworkDiagnostic.saveNetworkProfile(serverIP);
        await initializeAPI();
        onClose();
      } else {
        Alert.alert(
          'Warning',
          'Could not connect to server. Save anyway?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Save',
              onPress: async () => {
                await NetworkDiagnostic.saveNetworkProfile(serverIP);
                await initializeAPI();
                onClose();
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error saving server IP:', error);
      Alert.alert('Error', 'Failed to save server IP');
    } finally {
      setIsLoading(false);
    }
  };

  const discoverServer = async () => {
    try {
      setIsLoading(true);
      setTestStatus('discovering');
      
      const discoveredServer = await NetworkDiagnostic.discoverServer();
      
      if (discoveredServer) {
        setServerIP(discoveredServer.ip);
        setTestStatus('connected');
        Alert.alert('Success', `Found server at ${discoveredServer.ip}`);
      } else {
        setTestStatus('error');
        Alert.alert('Not Found', 'Could not discover server automatically');
      }
    } catch (error) {
      console.error('Error discovering server:', error);
      setTestStatus('error');
      Alert.alert('Error', 'Failed to discover server');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (testStatus) {
      case 'connected':
        return colors.success;
      case 'disconnected':
        return colors.error;
      case 'testing':
      case 'discovering':
        return colors.warning;
      default:
        return colors.text;
    }
  };

  const getStatusText = () => {
    switch (testStatus) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      case 'testing':
        return 'Testing...';
      case 'discovering':
        return 'Discovering...';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Network Configuration</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent}>
            <View style={styles.statusContainer}>
              <Text style={styles.statusLabel}>Status: </Text>
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Server IP Address</Text>
              <TextInput
                style={styles.input}
                value={serverIP}
                onChangeText={setServerIP}
                placeholder="Enter server IP address"
                keyboardType="numeric"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => testConnection()}
                disabled={isLoading || !serverIP}
              >
                <Text style={styles.buttonText}>Test Connection</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={discoverServer}
                disabled={isLoading}
              >
                <Text style={[styles.buttonText, styles.primaryButtonText]}>
                  Auto Discover
                </Text>
              </TouchableOpacity>
            </View>

            {suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>Suggested IPs:</Text>
                {suggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionItem}
                    onPress={() => handleSuggestionPress(suggestion)}
                  >
                    <Text style={styles.suggestionIP}>{suggestion.ip}</Text>
                    <Text style={styles.suggestionDesc}>{suggestion.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (isLoading || !serverIP) && styles.disabledButton
              ]}
              onPress={handleSave}
              disabled={isLoading || !serverIP}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Configuration</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '50%',
    maxHeight: '90%'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text
  },
  closeButton: {
    padding: spacing.sm
  },
  scrollContent: {
    padding: spacing.lg
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg
  },
  statusLabel: {
    fontSize: 16,
    color: colors.text
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500'
  },
  inputContainer: {
    marginBottom: spacing.lg
  },
  label: {
    fontSize: 16,
    marginBottom: spacing.sm,
    color: colors.text
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl
  },
  button: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 8,
    marginHorizontal: spacing.xs
  },
  primaryButton: {
    backgroundColor: colors.primary
  },
  secondaryButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary
  },
  buttonText: {
    textAlign: 'center',
    fontSize: 16,
    color: colors.primary
  },
  primaryButtonText: {
    color: '#ffffff'
  },
  suggestionsContainer: {
    marginTop: spacing.lg
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: spacing.md,
    color: colors.text
  },
  suggestionItem: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: spacing.sm
  },
  suggestionIP: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text
  },
  suggestionDesc: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 4
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: 8,
    alignItems: 'center'
  },
  disabledButton: {
    opacity: 0.5
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default NetworkConfig;
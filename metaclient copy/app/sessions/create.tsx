import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import colors from '../constants/theme';
import { AuthContext } from '../contexts/AuthContext';
import { createSession } from '../utils/api';

const programmingLanguages = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'C#',
  'C++',
  'Ruby',
  'Go',
  'Swift',
  'Kotlin',
  'PHP',
  'Rust',
  'Dart',
  'Other'
];

const CreateSessionScreen = () => {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('JavaScript');
  const [initialCode, setInitialCode] = useState('// Start coding here...');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Check if user is authenticated
  useEffect(() => {
    if (!user) {
      Alert.alert(
        "Authentication Required",
        "You need to be logged in to create a session.",
        [{ text: "OK", onPress: () => router.replace('/login') }]
      );
    }
  }, [user, router]);
  
  const handleCreateSession = async () => {
    if (!title) {
      setError('Please provide a session title');
      return;
    }
    
    if (!user || !user._id) {
      setError('You must be logged in to create a session');
      router.replace('/login');
      return;
    }
    
    try {
      setLoading(true);
      const sessionData = {
        title,
        description,
        language,
        codeSnippet: initialCode,
        host: user._id,
      };
      
      const response = await createSession(sessionData);
      if (response && response.data && response.data._id) {
        const newSessionId = response.data._id;
        // Navigate to the new session
        router.push(`/sessions/${newSessionId}`);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Error creating session:', err);
      setError('Failed to create session. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Create Coding Session',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <ScrollView style={styles.form}>
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
        
        <Text style={styles.label}>Session Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter a title for your session"
          maxLength={50}
        />
        
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe what this session is about"
          multiline
          numberOfLines={4}
          maxLength={200}
        />
        
        <Text style={styles.label}>Programming Language</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={language}
            onValueChange={(itemValue) => setLanguage(itemValue)}
            style={styles.picker}
          >
            {programmingLanguages.map((lang) => (
              <Picker.Item key={lang} label={lang} value={lang} />
            ))}
          </Picker>
        </View>
        
        <Text style={styles.label}>Initial Code (Optional)</Text>
        <TextInput
          style={[styles.input, styles.codeInput]}
          value={initialCode}
          onChangeText={setInitialCode}
          placeholder="// Start with some initial code..."
          multiline
          numberOfLines={10}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
        />
        
        <TouchableOpacity 
          style={styles.createButton} 
          onPress={handleCreateSession}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create Session</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  backButton: {
    marginLeft: 10,
  },
  form: {
    padding: 20,
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 20,
  },
  picker: {
    height: 50,
  },
  codeInput: {
    fontFamily: 'monospace',
    height: 200,
    textAlignVertical: 'top',
    backgroundColor: '#1e1e1e',
    color: '#fff',
    padding: 15,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CreateSessionScreen;
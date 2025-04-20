import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/theme';
import { AuthContext } from '../contexts/AuthContext';
import { getSessionById, joinSession, leaveSession, updateCodeSnippet, updateSessionStatus } from '../utils/api';
import socketUtils from '../utils/socket';

const SessionScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useContext(AuthContext);
  
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [code, setCode] = useState('');
  const [participants, setParticipants] = useState([]);
  const [joinedSession, setJoinedSession] = useState(false);
  const [isHost, setIsHost] = useState(false);
  
  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        const response = await getSessionById(id);
        const sessionData = response.data;
        
        setSession(sessionData);
        setCode(sessionData.codeSnippet || '// Start coding here...');
        setParticipants(sessionData.participants || []);
        
        // Check if current user is the host
        setIsHost(sessionData.host._id === user._id);
        
        // Check if user is already a participant
        const isParticipant = sessionData.participants.some(p => p._id === user._id);
        setJoinedSession(isParticipant);
        
        if (!isParticipant) {
          handleJoinSession();
        }
      } catch (err) {
        console.error('Error fetching session:', err);
        setError('Failed to load session details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSession();
    
    // Handle clean-up when the component unmounts
    return () => {
      if (joinedSession) {
        handleLeaveSession();
      }
    };
  }, [id, user._id]);
  
  useEffect(() => {
    if (!session) return;
    
    // Initialize socket connection
    const initSocketConnection = async () => {
      await socketUtils.initializeSocket();
      
      // Join session room
      socketUtils.joinSessionRoom(id);
      
      // Subscribe to code updates
      socketUtils.onCodeUpdate(handleCodeUpdate);
      socketUtils.onParticipantJoined(handleParticipantJoined);
      socketUtils.onParticipantLeft(handleParticipantLeft);
      socketUtils.onSessionUpdate(handleSessionUpdate);
    };
    
    initSocketConnection();
    
    // Clean up socket connection when component unmounts
    return () => {
      socketUtils.leaveSessionRoom(id);
      socketUtils.removeAllListeners();
    };
  }, [session, id]);
  
  const handleCodeUpdate = (data) => {
    if (data.sessionId === id && data.codeSnippet !== code) {
      setCode(data.codeSnippet);
    }
  };
  
  const handleParticipantJoined = (data) => {
    if (data.sessionId === id) {
      setParticipants(prev => {
        if (!prev.some(p => p._id === data.user._id)) {
          return [...prev, data.user];
        }
        return prev;
      });
    }
  };
  
  const handleParticipantLeft = (data) => {
    if (data.sessionId === id) {
      setParticipants(prev => prev.filter(p => p._id !== data.userId));
      
      if (data.hostLeft) {
        // Handle host leaving - maybe show alert or navigate back
        alert('The host has ended the session');
        router.back();
      }
    }
  };
  
  const handleSessionUpdate = (data) => {
    if (data.sessionId === id) {
      if (data.type === 'ended') {
        alert('This session has ended');
        router.back();
      }
    }
  };
  
  const handleCodeChange = (text) => {
    setCode(text);
    
    // Emit code change event to other participants
    socketUtils.sendCodeUpdate(id, text);
    
    // Update code on server periodically (debounced)
    // In a real app, implement proper debouncing
    updateCodeSnippet(id, text).catch(err => {
      console.error('Error updating code:', err);
    });
  };
  
  const handleJoinSession = async () => {
    try {
      await joinSession(id);
      setJoinedSession(true);
    } catch (err) {
      console.error('Error joining session:', err);
      setError('Failed to join session');
    }
  };
  
  const handleLeaveSession = async () => {
    try {
      await leaveSession(id);
      setJoinedSession(false);
      router.back();
    } catch (err) {
      console.error('Error leaving session:', err);
    }
  };
  
  const handleEndSession = async () => {
    try {
      await updateSessionStatus(id, 'ended');
      router.back();
    } catch (err) {
      console.error('Error ending session:', err);
      setError('Failed to end session');
    }
  };
  
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text>Loading session...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  if (!session) {
    return (
      <View style={styles.centered}>
        <Text>Session not found</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: session.title,
          headerRight: () => (
            <View style={styles.headerButtons}>
              {isHost ? (
                <TouchableOpacity onPress={handleEndSession} style={styles.headerButton}>
                  <Ionicons name="close-circle-outline" size={24} color="red" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleLeaveSession} style={styles.headerButton}>
                  <Ionicons name="exit-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          ),
        }}
      />
      
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionTitle}>{session.title}</Text>
        <Text style={styles.sessionDescription}>{session.description}</Text>
        <Text style={styles.languageLabel}>Language: 
          <Text style={styles.languageText}> {session.language || 'JavaScript'}</Text>
        </Text>
        
        <View style={styles.hostInfo}>
          <Text style={styles.hostLabel}>Host: </Text>
          <Text style={styles.hostName}>{session.host?.name || 'Unknown'}</Text>
        </View>
      </View>
      
      <View style={styles.codeContainer}>
        <TextInput
          style={styles.codeEditor}
          value={code}
          onChangeText={handleCodeChange}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
        />
      </View>
      
      <View style={styles.participantsContainer}>
        <Text style={styles.participantsTitle}>
          Participants ({participants.length})
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {participants.map((participant) => (
            <View key={participant._id} style={styles.participant}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>
                  {participant.name ? participant.name.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
              <Text style={styles.participantName}>
                {participant.name}
                {participant._id === session.host._id ? ' (Host)' : ''}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    marginBottom: 20,
    textAlign: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 15,
  },
  sessionInfo: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sessionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  sessionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  languageLabel: {
    fontSize: 14,
    marginBottom: 5,
  },
  languageText: {
    fontWeight: 'bold',
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostLabel: {
    fontSize: 14,
  },
  hostName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  codeContainer: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    margin: 10,
    padding: 10,
  },
  codeEditor: {
    flex: 1,
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 14,
    textAlignVertical: 'top',
  },
  participantsContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  participantsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  participant: {
    alignItems: 'center',
    marginRight: 15,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  participantName: {
    marginTop: 5,
    fontSize: 12,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default SessionScreen;
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  RefreshControl
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, SlideInRight } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { getUserProjects, getAllActivities, getLiveSessions } from "../utils/api";
import socketUtils from "../utils/socket";

const { width } = Dimensions.get("window");

const DEFAULT_AVATAR = require("../../assets/images/avatars/user.jpeg");
const DEFAULT_IMAGE = require("../../assets/images/code-preview.png");

// Helper function to format time
const formatTimeAgo = (timestamp) => {
  const now = new Date();
  const date = new Date(timestamp);
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  
  const months = Math.floor(days / 30);
  return `${months} ${months === 1 ? 'month' : 'months'} ago`;
};

// Helper function to map action types to readable text
const getActionText = (actionType) => {
  switch (actionType) {
    case 'commit': return 'committed to';
    case 'comment': return 'commented on';
    case 'pull_request': return 'created a pull request in';
    case 'merge': return 'merged pull request in';
    case 'issue': return 'created an issue in';
    case 'join': return 'joined';
    case 'update': return 'updated';
    default: return 'interacted with';
  }
};

export default function CollaborateScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("projects");
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    projectCount: 0,
    commitCount: 0,
    collaboratorCount: 0
  });

  // Initialize socket connection
  useEffect(() => {
    const initSocket = async () => {
      await socketUtils.initializeSocket();
      
      // Only set up listeners if socket is initialized
      const socket = socketUtils.getSocket();
      if (socket) {
        // Listen for new project activities
        socketUtils.onProjectActivity((activity) => {
          setActivities(prev => [activity, ...prev]);
        });
        
        // Listen for session updates
        socketUtils.onSessionUpdate((update) => {
          if (update.type === 'status_change') {
            setLiveSessions(prev => 
              prev.map(session => 
                session._id === update.session._id ? update.session : session
              )
            );
          }
        });
      }
    };
    
    initSocket();
    
    return () => {
      // Use the socketUtils cleanup methods which have built-in null checks
      socketUtils.removeAllListeners();
    };
  }, []);

  // Load data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch projects
      const projectsResponse = await getUserProjects();
      setProjects(projectsResponse.data);
      
      // Set stats based on projects data
      setStats({
        projectCount: projectsResponse.count || 0,
        commitCount: projectsResponse.data.reduce((total, project) => total + (project.commitCount || 0), 0),
        collaboratorCount: new Set(
          projectsResponse.data.flatMap(project => 
            project.collaborators ? project.collaborators.map(c => c._id) : []
          )
        ).size
      });
      
      // Fetch activities
      const activitiesResponse = await getAllActivities();
      setActivities(activitiesResponse.data);
      
      // Fetch live sessions
      const sessionsResponse = await getLiveSessions();
      setLiveSessions(sessionsResponse.data);
      
    } catch (error) {
      console.error('Error fetching collaborate data:', error);
      Alert.alert('Error', 'Failed to load collaboration data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Handle creating a new project
  const handleCreateProject = () => {
    router.push('/projects/create');
  };

  // Handle joining a live session
  const handleJoinSession = async (sessionId) => {
    try {
      router.push(`/sessions/${sessionId}`);
    } catch (error) {
      console.error('Error joining session:', error);
      Alert.alert('Error', 'Failed to join the session. Please try again.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading collaboration data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f0f4f8" }}>
      <ScrollView 
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Collaborate</Text>
          <TouchableOpacity style={styles.iconButton} onPress={handleCreateProject}>
            <Ionicons name="add-circle" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "projects" && styles.activeTab]}
            onPress={() => setActiveTab("projects")}
          >
            <Text
              style={[styles.tabText, activeTab === "projects" && styles.activeTabText]}
            >
              Projects
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "activity" && styles.activeTab]}
            onPress={() => setActiveTab("activity")}
          >
            <Text
              style={[styles.tabText, activeTab === "activity" && styles.activeTabText]}
            >
              Activity
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "projects" ? (
          <View style={styles.projectsContainer}>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.projectCount}</Text>
                <Text style={styles.statLabel}>Projects</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.commitCount}</Text>
                <Text style={styles.statLabel}>Commits</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.collaboratorCount}</Text>
                <Text style={styles.statLabel}>Collaborators</Text>
              </View>
            </View>

            {projects.length > 0 ? (
              projects.map((project, index) => (
                <Animated.View
                  key={project._id}
                  entering={SlideInRight.delay(index * 100).springify()}
                  style={styles.projectCard}
                >
                  <View style={styles.projectHeader}>
                    <Text style={styles.projectTitle}>{project.title}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        project.status === "Active" ? styles.activeStatus : styles.recruitingStatus,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          project.status === "Active"
                            ? styles.activeStatusText
                            : styles.recruitingStatusText,
                        ]}
                      >
                        {project.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.projectDescription}>{project.description}</Text>

                  <View style={styles.skillsRow}>
                    {project.skills && project.skills.map((skill, idx) => (
                      <View key={idx} style={styles.skillChip}>
                        <Text style={styles.skillText}>{skill}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.progressContainer}>
                    <View style={styles.progressBarBackground}>
                      <View
                        style={[styles.progressBar, { width: `${project.progress}%` }]}
                      />
                    </View>
                    <Text style={styles.progressText}>{project.progress}%</Text>
                  </View>

                  <View style={styles.projectFooter}>
                    <View style={styles.creatorContainer}>
                      <Image 
                        source={project.creator?.avatar ? { uri: project.creator.avatar } : DEFAULT_AVATAR} 
                        style={styles.creatorAvatar} 
                      />
                      <Text style={styles.creatorName}>{project.creator?.name || 'Unknown'}</Text>
                    </View>
                    <View style={styles.collaboratorsContainer}>
                      <Ionicons name="people-outline" size={16} color="#64748b" />
                      <Text style={styles.collaboratorsText}>
                        {project.collaborators?.length || 0} collaborators
                      </Text>
                    </View>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => router.push(`/projects/${project._id}/code`)}
                    >
                      <Ionicons name="git-branch-outline" size={18} color="#3b82f6" />
                      <Text style={styles.actionButtonText}>View Code</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => router.push(`/projects/${project._id}/chat`)}
                    >
                      <Ionicons name="chatbubble-outline" size={18} color="#3b82f6" />
                      <Text style={styles.actionButtonText}>Discuss</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="code-slash-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No Projects Yet</Text>
                <Text style={styles.emptyText}>
                  Create or join a project to start collaborating
                </Text>
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={handleCreateProject}
                >
                  <Text style={styles.emptyButtonText}>Create Project</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.activityContainer}>
            {activities.length > 0 ? (
              activities.map((activity, index) => (
                <Animated.View
                  key={activity._id}
                  entering={FadeIn.delay(index * 100)}
                  style={styles.activityCard}
                >
                  <Image 
                    source={activity.user?.avatar ? { uri: activity.user.avatar } : DEFAULT_AVATAR} 
                    style={styles.activityAvatar} 
                  />
                  <View style={styles.activityContent}>
                    <View style={styles.activityHeader}>
                      <Text style={styles.activityText}>
                        <Text style={styles.activityUserName}>{activity.user?.name || 'Unknown'} </Text>
                        {getActionText(activity.actionType)}{" "}
                        <Text style={styles.activityProjectName}>{activity.project?.title || 'Unknown Project'}</Text>
                      </Text>
                      <Text style={styles.activityTime}>{formatTimeAgo(activity.createdAt)}</Text>
                    </View>
                    <Text style={styles.activityDetails}>{activity.details}</Text>
                  </View>
                </Animated.View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="time-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No Activity Yet</Text>
                <Text style={styles.emptyText}>
                  When you or your collaborators make changes to projects, they'll appear here
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.codeEditorPreview}>
          <Text style={styles.previewTitle}>Live Coding Sessions</Text>
          
          {liveSessions.length > 0 ? (
            liveSessions.map((session, index) => (
              <TouchableOpacity 
                key={session._id}
                style={styles.previewCard}
                onPress={() => handleJoinSession(session._id)}
              >
                <View style={styles.previewHeader}>
                  <View style={styles.liveBadge}>
                    <View style={styles.liveIndicator} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                  <Text style={styles.previewCardTitle}>{session.title}</Text>
                </View>
                <Image
                  source={DEFAULT_IMAGE}
                  style={styles.codeImage}
                  resizeMode="cover"
                />
                <View style={styles.previewFooter}>
                  <View style={styles.previewParticipants}>
                    {session.participants && session.participants.slice(0, 3).map((participant, idx) => (
                      <Image
                        key={idx}
                        source={participant.avatar ? { uri: participant.avatar } : DEFAULT_AVATAR}
                        style={[styles.participantAvatar, idx > 0 && { marginLeft: -10 }]}
                      />
                    ))}
                    {session.participants && session.participants.length > 3 && (
                      <View style={styles.moreParticipants}>
                        <Text style={styles.moreParticipantsText}>+{session.participants.length - 3}</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity 
                    style={styles.joinButton}
                    onPress={() => handleJoinSession(session._id)}
                  >
                    <Text style={styles.joinButtonText}>Join Session</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptySessionContainer}>
              <Ionicons name="code-outline" size={36} color="#94a3b8" />
              <Text style={styles.emptySessionTitle}>No Live Sessions</Text>
              <Text style={styles.emptySessionText}>
                There are no active coding sessions at the moment
              </Text>
              <TouchableOpacity
                style={styles.createSessionButton}
                onPress={() => router.push('/sessions/create')}
              >
                <Text style={styles.createSessionText}>Create Session</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#f0f4f8",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },
  emptyContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  emptySessionContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptySessionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
    marginTop: 12,
    marginBottom: 6,
  },
  emptySessionText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 16,
  },
  createSessionButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createSessionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    fontFamily: "Inter-Bold",
  },
  iconButton: {
    padding: 6,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: "#ffffff",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
    fontFamily: "Inter-SemiBold",
  },
  activeTabText: {
    color: "#1e293b",
  },
  projectsContainer: {
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    width: width / 3.5,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3b82f6",
    marginBottom: 4,
    fontFamily: "Inter-Bold",
  },
  statLabel: {
    fontSize: 13,
    color: "#64748b",
    fontFamily: "Inter-Medium",
  },
  projectCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  projectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
    flex: 1,
    fontFamily: "Inter-SemiBold",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeStatus: {
    backgroundColor: "#ecfdf5",
  },
  recruitingStatus: {
    backgroundColor: "#eff6ff",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    fontFamily: "Inter-Medium",
  },
  activeStatusText: {
    color: "#10b981",
  },
  recruitingStatusText: {
    color: "#3b82f6",
  },
  projectDescription: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 12,
    fontFamily: "Inter-Regular",
  },
  skillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  skillChip: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  skillText: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: "Inter-Medium",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    marginRight: 10,
    overflow: "hidden",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#3b82f6",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748b",
    fontFamily: "Inter-Medium",
  },
  projectFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  creatorContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  creatorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  creatorName: {
    fontSize: 13,
    color: "#64748b",
    fontFamily: "Inter-Medium",
  },
  collaboratorsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  collaboratorsText: {
    fontSize: 13,
    color: "#64748b",
    marginLeft: 4,
    fontFamily: "Inter-Regular",
  },
  actionButtons: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  actionButtonText: {
    fontSize: 13,
    color: "#3b82f6",
    marginLeft: 4,
    fontFamily: "Inter-Medium",
  },
  activityContainer: {
    marginBottom: 20,
  },
  activityCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activityAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  activityText: {
    fontSize: 14,
    color: "#64748b",
    flex: 1,
    fontFamily: "Inter-Regular",
  },
  activityUserName: {
    fontWeight: "600",
    color: "#1e293b",
    fontFamily: "Inter-SemiBold",
  },
  activityProjectName: {
    color: "#3b82f6",
    fontFamily: "Inter-SemiBold",
  },
  activityTime: {
    fontSize: 12,
    color: "#94a3b8",
    marginLeft: 8,
    fontFamily: "Inter-Regular",
  },
  activityDetails: {
    fontSize: 13,
    color: "#64748b",
    fontFamily: "Inter-Regular",
  },
  codeEditorPreview: {
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#1e293b",
    fontFamily: "Inter-SemiBold",
  },
  previewCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  previewHeader: {
    marginBottom: 12,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ef4444",
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#ef4444",
    fontFamily: "Inter-Bold",
  },
  previewCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    fontFamily: "Inter-SemiBold",
  },
  codeImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
  },
  previewFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewParticipants: {
    flexDirection: "row",
    alignItems: "center",
  },
  participantAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  moreParticipants: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -10,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  moreParticipantsText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#64748b",
    fontFamily: "Inter-Bold",
  },
  joinButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
    fontFamily: "Inter-SemiBold",
  },
});
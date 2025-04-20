import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as api from "../utils/api";
import socketUtils from "../utils/socket";
import { useAuth } from "../contexts/AuthContext";
import { format } from "date-fns";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.7;

// Default image when community or event doesn't have one
const DEFAULT_IMAGE = require("../../assets/images/code-preview.png");

export default function CommunityScreen() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("events");
  const [communities, setCommunities] = useState([]);
  const [events, setEvents] = useState([]);
  const [userCommunities, setUserCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCommunity, setNewCommunity] = useState({
    name: "",
    description: "",
    tags: []
  });
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    startDate: new Date(),
    endDate: new Date(Date.now() + 3600000), // 1 hour from now
    location: "",
    isVirtual: false,
    community: "",
  });

  // Fetch all communities and events on component mount
  useEffect(() => {
    fetchData();
    
    // Set up event listeners for real-time updates
    const communityMessageUnsub = socketUtils.onCommunityMessage(handleCommunityUpdate);
    const eventUpdateUnsub = socketUtils.onEventUpdate(handleEventUpdate);
    
    // Cleanup on unmount
    return () => {
      communityMessageUnsub && communityMessageUnsub();
      eventUpdateUnsub && eventUpdateUnsub();
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all communities
      const allCommunities = await api.getAllCommunities();
      setCommunities(allCommunities);
      
      // Fetch user's communities if user is logged in
      if (user && user.id) {
        const userComms = await api.getUserCommunities(user.id);
        setUserCommunities(userComms);
      }
      
      // Fetch all events
      const allEvents = await api.getAllEvents();
      setEvents(allEvents);
    } catch (error) {
      console.error('Error fetching community data:', error);
      Alert.alert('Error', 'Failed to load community data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle real-time updates
  const handleCommunityUpdate = (data) => {
    fetchData(); // Refresh data when community changes
  };

  const handleEventUpdate = (data) => {
    fetchData(); // Refresh data when event changes
  };

  // Join a community
  const handleJoinCommunity = async (communityId) => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please log in to join communities.');
      return;
    }
    
    try {
      await api.joinCommunity(communityId);
      // Join the community room for real-time updates
      socketUtils.joinCommunityRoom(communityId);
      
      // Update local state
      fetchData();
      
      Alert.alert('Success', 'You have joined the community!');
    } catch (error) {
      console.error('Error joining community:', error);
      Alert.alert('Error', 'Failed to join community. Please try again.');
    }
  };

  // Leave a community
  const handleLeaveCommunity = async (communityId) => {
    try {
      await api.leaveCommunity(communityId);
      // Leave the community room
      socketUtils.leaveCommunityRoom(communityId);
      
      // Update local state
      fetchData();
      
      Alert.alert('Success', 'You have left the community.');
    } catch (error) {
      console.error('Error leaving community:', error);
      Alert.alert('Error', 'Failed to leave community. Please try again.');
    }
  };

  // RSVP to an event
  const handleRsvpEvent = async (eventId) => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please log in to RSVP for events.');
      return;
    }
    
    try {
      await api.rsvpEvent(eventId);
      
      // Update local state
      fetchData();
      
      Alert.alert('Success', 'Your RSVP has been updated!');
    } catch (error) {
      console.error('Error RSVPing to event:', error);
      Alert.alert('Error', 'Failed to update RSVP. Please try again.');
    }
  };

  // Create a new community
  const handleCreateCommunity = async () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please log in to create communities.');
      return;
    }
    
    if (!newCommunity.name || !newCommunity.description) {
      Alert.alert('Validation Error', 'Name and description are required.');
      return;
    }
    
    try {
      await api.createCommunity(newCommunity);
      
      // Reset form and close modal
      setNewCommunity({ name: "", description: "", tags: [] });
      setShowCreateModal(false);
      
      // Update local state
      fetchData();
      
      Alert.alert('Success', 'Community created successfully!');
    } catch (error) {
      console.error('Error creating community:', error);
      Alert.alert('Error', 'Failed to create community. Please try again.');
    }
  };

  // Filter communities and events based on search query
  const filteredCommunities = communities.filter(community => 
    community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    community.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredEvents = events.filter(event => 
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if user is a member of a community
  const isUserMember = (community) => {
    return community.members.some(member => member._id === user?.id);
  };

  // Check if user is attending an event
  const isUserAttending = (event) => {
    return event.attendees.some(attendee => attendee._id === user?.id);
  };

  // Format event date
  const formatEventDate = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start.toDateString() === end.toDateString()) {
      return `${format(start, 'MMMM d, yyyy')}`;
    }
    
    return `${format(start, 'MMMM d')} - ${format(end, 'MMMM d, yyyy')}`;
  };

  // Format event time
  const formatEventTime = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading communities...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
        <TouchableOpacity>
          <Ionicons name="options-outline" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={activeTab === "events" ? "Search events..." : "Search communities..."}
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.locationButton}>
          <Ionicons name="location-outline" size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "events" && styles.activeTab]}
          onPress={() => setActiveTab("events")}
        >
          <Text style={[styles.tabText, activeTab === "events" && styles.activeTabText]}>
            Events
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "communities" && styles.activeTab]}
          onPress={() => setActiveTab("communities")}
        >
          <Text style={[styles.tabText, activeTab === "communities" && styles.activeTabText]}>
            Communities
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === "events" ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Events</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>

            {filteredEvents.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.eventCardsContainer}
              >
                {filteredEvents.map((event, index) => (
                  <Animated.View
                    key={event._id}
                    entering={FadeInDown.delay(index * 100).springify()}
                    style={styles.eventCard}
                  >
                    <Image 
                      source={event.image ? { uri: event.image } : DEFAULT_IMAGE} 
                      style={styles.eventImage} 
                    />
                    <View style={styles.eventContent}>
                      <View style={styles.eventHeader}>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                      </View>
                      <Text style={styles.eventDescription} numberOfLines={2}>
                        {event.description}
                      </Text>
                      <View style={styles.eventDetails}>
                        <View style={styles.eventDetailItem}>
                          <Ionicons name="calendar-outline" size={14} color="#64748b" />
                          <Text style={styles.eventDetailText}>
                            {formatEventDate(event.startDate, event.endDate)}
                          </Text>
                        </View>
                        <View style={styles.eventDetailItem}>
                          <Ionicons name="time-outline" size={14} color="#64748b" />
                          <Text style={styles.eventDetailText}>
                            {formatEventTime(event.startDate, event.endDate)}
                          </Text>
                        </View>
                        <View style={styles.eventDetailItem}>
                          <Ionicons name="location-outline" size={14} color="#64748b" />
                          <Text style={styles.eventDetailText}>
                            {event.location} {event.isVirtual && "(Virtual)"}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.eventFooter}>
                        <View style={styles.attendeesContainer}>
                          <Text style={styles.attendeesText}>
                            {event.attendees.length} attending
                          </Text>
                        </View>
                        <TouchableOpacity 
                          style={[
                            styles.attendButton,
                            isUserAttending(event) && styles.attendingButton
                          ]}
                          onPress={() => handleRsvpEvent(event._id)}
                        >
                          <Text style={styles.attendButtonText}>
                            {isUserAttending(event) ? "Cancel" : "Attend"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Animated.View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="calendar-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyStateText}>No events found</Text>
                <Text style={styles.emptyStateSubtext}>
                  {searchQuery ? "Try a different search term" : "Join communities to see their events"}
                </Text>
              </View>
            )}

            <View style={styles.categoriesSection}>
              <Text style={styles.categoriesTitle}>Explore Categories</Text>
              <View style={styles.categoriesGrid}>
                <TouchableOpacity style={styles.categoryItem} onPress={() => setSearchQuery("Coding")}>
                  <Ionicons name="code-slash-outline" size={24} color="#3b82f6" />
                  <Text style={styles.categoryText}>Coding</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.categoryItem} onPress={() => setSearchQuery("Data Science")}>
                  <Ionicons name="flask-outline" size={24} color="#8b5cf6" />
                  <Text style={styles.categoryText}>Data Science</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.categoryItem} onPress={() => setSearchQuery("Cloud")}>
                  <Ionicons name="cloud-outline" size={24} color="#ec4899" />
                  <Text style={styles.categoryText}>Cloud</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.categoryItem} onPress={() => setSearchQuery("Mobile")}>
                  <Ionicons name="phone-portrait-outline" size={24} color="#f59e0b" />
                  <Text style={styles.categoryText}>Mobile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.categoryItem} onPress={() => setSearchQuery("DevOps")}>
                  <Ionicons name="git-branch-outline" size={24} color="#10b981" />
                  <Text style={styles.categoryText}>DevOps</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.categoryItem} onPress={() => setSearchQuery("Security")}>
                  <Ionicons name="shield-checkmark-outline" size={24} color="#ef4444" />
                  <Text style={styles.categoryText}>Security</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.createEventSection}>
              <View style={styles.createEventContent}>
                <Ionicons name="calendar" size={32} color="#3b82f6" />
                <Text style={styles.createEventTitle}>Create your own tech event</Text>
                <Text style={styles.createEventDescription}>
                  Share your knowledge and connect with other developers
                </Text>
                <TouchableOpacity 
                  style={styles.createEventButton}
                  onPress={() => {
                    if (!user) {
                      Alert.alert('Authentication Required', 'Please log in to create events.');
                      return;
                    }
                    if (userCommunities.length === 0) {
                      Alert.alert('No Communities', 'You need to be in a community to create an event. Join or create a community first.');
                      return;
                    }
                    // Navigate to event creation 
                    Alert.alert('Create Event', 'This functionality is coming soon!');
                  }}
                >
                  <Text style={styles.createEventButtonText}>Create Event</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Communities</Text>
            </View>

            {filteredCommunities.length > 0 ? (
              filteredCommunities.map((community, index) => (
                <Animated.View
                  key={community._id}
                  entering={FadeInDown.delay(index * 100).springify()}
                  style={styles.communityCard}
                >
                  <Image 
                    source={community.image ? { uri: community.image } : DEFAULT_IMAGE} 
                    style={styles.communityImage} 
                  />
                  <View style={styles.communityContent}>
                    <View style={styles.communityHeader}>
                      <Text style={styles.communityName}>{community.name}</Text>
                      {isUserMember(community) && <View style={styles.joinedBadge} />}
                    </View>
                    <Text style={styles.membersText}>{community.members.length} members</Text>
                    <Text style={styles.communityDescription} numberOfLines={2}>
                      {community.description}
                    </Text>
                    {user && (
                      <TouchableOpacity
                        style={[
                          styles.communityButton,
                          isUserMember(community) ? styles.leaveButton : styles.joinButton,
                        ]}
                        onPress={() => isUserMember(community) 
                          ? handleLeaveCommunity(community._id) 
                          : handleJoinCommunity(community._id)
                        }
                      >
                        <Text
                          style={[
                            styles.communityButtonText,
                            isUserMember(community) ? styles.leaveButtonText : styles.joinButtonText,
                          ]}
                        >
                          {isUserMember(community) ? "Leave" : "Join"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Animated.View>
              ))
            ) : (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="people-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyStateText}>No communities found</Text>
                <Text style={styles.emptyStateSubtext}>
                  {searchQuery ? "Try a different search term" : "Create a new community to get started"}
                </Text>
              </View>
            )}

            <View style={styles.createCommunitySection}>
              <TouchableOpacity 
                style={styles.createCommunityButton}
                onPress={() => {
                  if (!user) {
                    Alert.alert('Authentication Required', 'Please log in to create communities.');
                    return;
                  }
                  setShowCreateModal(true);
                }}
              >
                <Ionicons name="add" size={24} color="#ffffff" />
                <Text style={styles.createCommunityText}>Create New Community</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Create Community Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Community</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Community Name"
              value={newCommunity.name}
              onChangeText={(text) => setNewCommunity({...newCommunity, name: text})}
            />
            
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              placeholder="Description"
              multiline
              numberOfLines={4}
              value={newCommunity.description}
              onChangeText={(text) => setNewCommunity({...newCommunity, description: text})}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Tags (comma separated)"
              value={newCommunity.tags.join(", ")}
              onChangeText={(text) => setNewCommunity({
                ...newCommunity, 
                tags: text.split(",").map(tag => tag.trim()).filter(tag => tag)
              })}
            />
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateCommunity}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ...existing styles...
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  emptyStateContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#64748b',
  },
  emptyStateSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  attendingButton: {
    backgroundColor: '#f1f5f9',
  },
  attendingButtonText: {
    color: '#64748b',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: width * 0.9,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  modalInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#1e293b',
  },
  modalTextarea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#3b82f6',
  },
  createButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  
  // Keep all existing styles
  container: {
    flex: 1,
    backgroundColor: "#f0f4f8",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 48,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: "#1e293b",
  },
  locationButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  tab: {
    marginRight: 24,
    paddingBottom: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#3b82f6",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#64748b",
  },
  activeTabText: {
    color: "#3b82f6",
    fontWeight: "600",
  },
  content: {
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
  },
  seeAllText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "500",
  },
  eventCardsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  eventCard: {
    width: CARD_WIDTH,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginHorizontal: 8,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  eventImage: {
    width: "100%",
    height: 140,
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
    flex: 1,
    marginRight: 8,
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  distanceText: {
    fontSize: 11,
    color: "#3b82f6",
    marginLeft: 2,
    fontWeight: "500",
  },
  eventDescription: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 12,
    lineHeight: 20,
  },
  eventDetails: {
    marginBottom: 16,
  },
  eventDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  eventDetailText: {
    fontSize: 13,
    color: "#64748b",
    marginLeft: 6,
  },
  eventFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  attendeesContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  attendeesText: {
    fontSize: 13,
    color: "#64748b",
  },
  attendButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  attendButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  categoriesSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  categoriesTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 16,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  categoryItem: {
    width: "31%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryText: {
    fontSize: 12,
    color: "#1e293b",
    fontWeight: "500",
    marginTop: 8,
    textAlign: "center",
  },
  createEventSection: {
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  createEventContent: {
    alignItems: "center",
  },
  createEventTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  createEventDescription: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 20,
  },
  createEventButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createEventButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
  communityCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  communityImage: {
    width: 100,
    height: "100%",
  },
  communityContent: {
    flex: 1,
    padding: 16,
  },
  communityHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  communityName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
    flex: 1,
    marginRight: 8,
  },
  joinedBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10b981",
  },
  membersText: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 8,
  },
  communityDescription: {
    fontSize: 14,
    color: "#1e293b",
    marginBottom: 12,
    lineHeight: 20,
  },
  communityButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  joinButton: {
    backgroundColor: "#3b82f6",
  },
  leaveButton: {
    backgroundColor: "#f1f5f9",
  },
  communityButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  joinButtonText: {
    color: "#ffffff",
  },
  leaveButtonText: {
    color: "#64748b",
  },
  createCommunitySection: {
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  createCommunityButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1e40af",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  createCommunityText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginLeft: 8,
  },
});
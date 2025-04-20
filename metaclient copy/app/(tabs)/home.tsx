import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useAuth } from "../contexts/AuthContext";

// Sample data
const suggestedMentors = [
  {
    id: "1",
    name: "Emma Wilson",
    role: "Senior Frontend Engineer",
    avatar: require("../../assets/images/avatars/avatar3.png"),
    skills: ["React", "TypeScript", "Node.js"],
    rating: 4.9,
    reviews: 28,
  },
  {
    id: "2",
    name: "James Rodriguez",
    role: "Mobile Developer",
    avatar: require("../../assets/images/avatars/avatar1.png"),
    skills: ["React Native", "Swift", "Kotlin"],
    rating: 4.7,
    reviews: 19,
  },
  {
    id: "3",
    name: "Sarah Chen",
    role: "DevOps Engineer",
    avatar: require("../../assets/images/avatars/avatar4.png"),
    skills: ["AWS", "Docker", "Kubernetes"],
    rating: 4.8,
    reviews: 32,
  },
];

const upcomingEvents = [
  {
    id: "1",
    title: "React Native Workshop",
    date: "Today, 2:00 PM",
    participants: 8,
    image: require("../../assets/images/code-preview.png"),
  },
  {
    id: "2",
    title: "Web Development Meetup",
    date: "Tomorrow, 6:30 PM",
    participants: 12,
    image: require("../../assets/images/code-preview.png"),
  },
];

const recentActivity = [
  {
    id: "1",
    user: {
      name: "Alex Johnson",
      avatar: require("../../assets/images/avatars/avatar2.png"),
    },
    action: "completed a session with you",
    time: "2 hours ago",
  },
  {
    id: "2",
    user: {
      name: "Maya Patel",
      avatar: require("../../assets/images/avatars/avatar3.png"),
    },
    action: "scheduled a new session",
    time: "Yesterday",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth(); // Get user from auth context
  const [searchQuery, setSearchQuery] = useState("");
  
  // Helper function to get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.username}>{user?.name || "User"}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/(tabs)/profile")}>
            <Image
              source={user?.avatar ? { uri: user.avatar } : require("../../assets/images/avatars/user.jpeg")}
              style={styles.profileImage}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color="#64748b"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for skills, mentors..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options-outline" size={20} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Suggested Mentors</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mentorsContainer}
          >
            {suggestedMentors.map((mentor, index) => (
              <TouchableOpacity
                key={mentor.id}
                style={styles.mentorCard}
                onPress={() => router.push("/mentors/" + mentor.id as any)}
              >
                <Image source={mentor.avatar} style={styles.mentorAvatar} />
                <Text style={styles.mentorName}>{mentor.name}</Text>
                <Text style={styles.mentorRole}>{mentor.role}</Text>
                <View style={styles.mentorSkills}>
                  {mentor.skills.map((skill, idx) => (
                    <View key={idx} style={styles.skillBadge}>
                      <Text style={styles.skillText}>{skill}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color="#f59e0b" />
                  <Text style={styles.ratingText}>
                    {mentor.rating} ({mentor.reviews})
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(300).springify()}
          style={styles.eventsSection}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/schedule")}
            >
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.eventsContainer}
          >
            {upcomingEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => router.push("/events/" + event.id as any)}
              >
                <Image source={event.image} style={styles.eventImage} />
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <View style={styles.eventDetails}>
                    <View style={styles.eventDetail}>
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color="#64748b"
                      />
                      <Text style={styles.eventDetailText}>{event.date}</Text>
                    </View>
                    <View style={styles.eventDetail}>
                      <Ionicons
                        name="people-outline"
                        size={14}
                        color="#64748b"
                      />
                      <Text style={styles.eventDetailText}>
                        {event.participants} attending
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(400).springify()}
          style={styles.activitySection}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>

          {recentActivity.map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <Image
                source={activity.user.avatar}
                style={styles.activityAvatar}
              />
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>
                  <Text style={styles.activityName}>{activity.user.name}</Text>{" "}
                  {activity.action}
                </Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(500).springify()}
          style={styles.discoverSection}
        >
          <View style={styles.discoverCard}>
            <View style={styles.discoverContent}>
              <Text style={styles.discoverTitle}>
                Discover tech events in your area
              </Text>
              <Text style={styles.discoverText}>
                Join meetups and connect with local developers
              </Text>
              <TouchableOpacity
                style={styles.discoverButton}
                onPress={() => router.push("/(tabs)/community")}
              >
                <Text style={styles.discoverButtonText}>Explore</Text>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color="#ffffff"
                  style={styles.discoverButtonIcon}
                />
              </TouchableOpacity>
            </View>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.discoverImage}
              resizeMode="contain"
            />
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4f8",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 16,
    color: "#64748b",
    fontFamily: "Inter-Regular",
  },
  username: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    fontFamily: "Inter-Bold",
  },
  profileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#3b82f6",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 24,
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
    fontFamily: "Inter-Regular",
  },
  filterButton: {
    padding: 6,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    fontFamily: "Inter-Bold",
  },
  seeAllText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "500",
    fontFamily: "Inter-Medium",
  },
  mentorsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  mentorCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 8,
    width: 180,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: "center",
  },
  mentorAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  mentorName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
    textAlign: "center",
    fontFamily: "Inter-SemiBold",
  },
  mentorRole: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 12,
    textAlign: "center",
    fontFamily: "Inter-Regular",
  },
  mentorSkills: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 12,
  },
  skillBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 4,
    marginBottom: 4,
  },
  skillText: {
    fontSize: 10,
    color: "#3b82f6",
    fontFamily: "Inter-Medium",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: 4,
    fontFamily: "Inter-Medium",
  },
  eventsSection: {
    marginBottom: 24,
  },
  eventsContainer: {
    paddingHorizontal: 12,
  },
  eventCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginHorizontal: 8,
    width: 280,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  eventImage: {
    width: "100%",
    height: 120,
  },
  eventInfo: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
    fontFamily: "Inter-SemiBold",
  },
  eventDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  eventDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 4,
  },
  eventDetailText: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: 4,
    fontFamily: "Inter-Regular",
  },
  activitySection: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
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
  activityText: {
    fontSize: 14,
    color: "#1e293b",
    marginBottom: 4,
    fontFamily: "Inter-Regular",
  },
  activityName: {
    fontWeight: "600",
    fontFamily: "Inter-SemiBold",
  },
  activityTime: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: "Inter-Regular",
  },
  discoverSection: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  discoverCard: {
    backgroundColor: "#3b82f6",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#1e40af",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  discoverContent: {
    flex: 1,
  },
  discoverTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
    fontFamily: "Inter-Bold",
  },
  discoverText: {
    fontSize: 14,
    color: "#e0f2fe",
    marginBottom: 16,
    fontFamily: "Inter-Regular",
  },
  discoverButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  discoverButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
    fontFamily: "Inter-SemiBold",
  },
  discoverButtonIcon: {
    marginLeft: 4,
  },
  discoverImage: {
    width: 80,
    height: 80,
    marginLeft: 12,
  },
});
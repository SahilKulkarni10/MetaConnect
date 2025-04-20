import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";

// Get screen width
const { width } = Dimensions.get("window");

// Sample data for upcoming sessions
const SESSIONS = [
  {
    id: "1",
    title: "React Native Animation Workshop",
    date: "Today, 2:00 PM",
    duration: "1 hour",
    host: {
      name: "Alex Morgan",
      avatar: require("../../assets/images/avatars/avatar1.png"),
    },
    participants: 5,
    type: "online",
    isUpcoming: true,
  },
  {
    id: "2",
    title: "Advanced GitHub Actions",
    date: "Tomorrow, 10:00 AM",
    duration: "45 mins",
    host: {
      name: "Jordan Lee",
      avatar: require("../../assets/images/avatars/avatar2.png"),
    },
    participants: 3,
    type: "online",
    isUpcoming: true,
  },
  {
    id: "3",
    title: "Local Hackathon Planning",
    date: "Jun 15, 6:30 PM",
    duration: "1.5 hours",
    host: {
      name: "Taylor Swift",
      avatar: require("../../assets/images/avatars/avatar3.png"),
    },
    participants: 8,
    type: "in-person",
    location: "Tech Hub Coworking Space",
    isUpcoming: true,
  },
];

// Sample data for pending requests
const REQUESTS = [
  {
    id: "1",
    title: "Python Data Visualization",
    date: "Jun 18, 3:00 PM",
    duration: "1 hour",
    requester: {
      name: "Jamie Chen",
      avatar: require("../../assets/images/avatars/avatar4.png"),
    },
    message: "I'd like to get your help with matplotlib and pandas for my data science project.",
  },
  {
    id: "2",
    title: "AWS Deployment Help",
    date: "Jun 20, 11:00 AM",
    duration: "30 mins",
    requester: {
      name: "Alex Morgan",
      avatar: require("../../assets/images/avatars/avatar1.png"),
    },
    message: "Need help with deploying my React app on AWS. Can you guide me through it?",
  },
];

// Days of the week
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Generate dates for calendar
const generateCalendarDays = () => {
  const today = new Date();
  const days = [];

  for (let i = -3; i <= 10; i++) {
    const date = new Date();
    date.setDate(today.getDate() + i);
    days.push({
      date: date.getDate(),
      day: DAYS[date.getDay()],
      isToday: i === 0,
      isSelected: i === 0,
    });
  }

  return days;
};

export default function ScheduleScreen() {
  const [calendarDays] = useState(generateCalendarDays());
  const [activeTab, setActiveTab] = useState("upcoming");

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Schedule</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="add-circle" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <View style={styles.calendarContainer}>
        <View style={styles.monthSelector}>
          <Text style={styles.monthText}>June 2023</Text>
          <View style={styles.monthControls}>
            <TouchableOpacity style={styles.monthButton}>
              <Ionicons name="chevron-back" size={20} color="#64748b" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.monthButton}>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.calendarDays}
        >
          {calendarDays.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayItem,
                day.isSelected && styles.selectedDay,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  day.isSelected && styles.selectedDayText,
                ]}
              >
                {day.day}
              </Text>
              <Text
                style={[
                  styles.dateText,
                  day.isSelected && styles.selectedDateText,
                  day.isToday && styles.todayText,
                ]}
              >
                {day.date}
              </Text>
              {day.isToday && <View style={styles.todayIndicator} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "upcoming" && styles.activeTab]}
          onPress={() => setActiveTab("upcoming")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "upcoming" && styles.activeTabText,
            ]}
          >
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "requests" && styles.activeTab]}
          onPress={() => setActiveTab("requests")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "requests" && styles.activeTabText,
            ]}
          >
            Requests
          </Text>
          {REQUESTS.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{REQUESTS.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "past" && styles.activeTab]}
          onPress={() => setActiveTab("past")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "past" && styles.activeTabText,
            ]}
          >
            Past
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.contentContainer}>
        {activeTab === "upcoming" ? (
          <View>
            {SESSIONS.map((session, index) => (
              <Animated.View
                key={session.id}
                entering={FadeIn.delay(index * 100)}
                style={styles.sessionCard}
              >
                <View style={styles.sessionHeader}>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle}>{session.title}</Text>
                    <View style={styles.sessionMeta}>
                      <Ionicons
                        name="time-outline"
                        size={16}
                        color="#64748b"
                        style={styles.sessionMetaIcon}
                      />
                      <Text style={styles.sessionMetaText}>{session.date}</Text>
                      <Text style={styles.sessionDuration}>
                        • {session.duration}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.sessionTypeBadge,
                      session.type === "online"
                        ? styles.onlineBadge
                        : styles.inPersonBadge,
                    ]}
                  >
                    <Ionicons
                      name={
                        session.type === "online"
                          ? "videocam-outline"
                          : "location-outline"
                      }
                      size={12}
                      color={
                        session.type === "online" ? "#0369a1" : "#047857"
                      }
                    />
                    <Text
                      style={[
                        styles.sessionTypeBadgeText,
                        session.type === "online"
                          ? styles.onlineBadgeText
                          : styles.inPersonBadgeText,
                      ]}
                    >
                      {session.type === "online" ? "Online" : "In Person"}
                    </Text>
                  </View>
                </View>

                {session.type === "in-person" && (
                  <View style={styles.locationContainer}>
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color="#64748b"
                      style={styles.locationIcon}
                    />
                    <Text style={styles.locationText}>{session.location}</Text>
                  </View>
                )}

                <View style={styles.sessionHost}>
                  <Image
                    source={session.host.avatar}
                    style={styles.hostAvatar}
                  />
                  <View>
                    <Text style={styles.hostLabel}>Hosted by</Text>
                    <Text style={styles.hostName}>{session.host.name}</Text>
                  </View>
                </View>

                <View style={styles.sessionFooter}>
                  <View style={styles.participantsContainer}>
                    <Ionicons
                      name="people-outline"
                      size={16}
                      color="#64748b"
                      style={styles.participantsIcon}
                    />
                    <Text style={styles.participantsText}>
                      {session.participants} participants
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.joinButton}>
                    <Text style={styles.joinButtonText}>
                      {session.isUpcoming ? "Join" : "View Details"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ))}
          </View>
        ) : activeTab === "requests" ? (
          <View>
            {REQUESTS.map((request, index) => (
              <Animated.View
                key={request.id}
                entering={FadeIn.delay(index * 100)}
                style={styles.requestCard}
              >
                <View style={styles.requestHeader}>
                  <Image
                    source={request.requester.avatar}
                    style={styles.requesterAvatar}
                  />
                  <View style={styles.requestInfo}>
                    <Text style={styles.requesterName}>
                      {request.requester.name}
                    </Text>
                    <Text style={styles.requestTitle}>{request.title}</Text>
                  </View>
                </View>

                <Text style={styles.requestMessage}>{request.message}</Text>

                <View style={styles.requestMeta}>
                  <View style={styles.requestTimeInfo}>
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color="#64748b"
                      style={styles.requestMetaIcon}
                    />
                    <Text style={styles.requestMetaText}>{request.date}</Text>
                    <Text style={styles.requestDuration}>
                      • {request.duration}
                    </Text>
                  </View>
                </View>

                <View style={styles.requestActions}>
                  <TouchableOpacity style={styles.declineButton}>
                    <Text style={styles.declineButtonText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.acceptButton}>
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyStateContainer}>
            <Ionicons
              name="calendar-outline"
              size={64}
              color="#d1d5db"
              style={styles.emptyStateIcon}
            />
            <Text style={styles.emptyStateText}>
              No past sessions to display
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Your completed sessions will appear here
            </Text>
          </View>
        )}
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
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
  },
  iconButton: {
    padding: 6,
  },
  calendarContainer: {
    paddingVertical: 8,
    backgroundColor: "#ffffff",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  monthSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  monthText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  monthControls: {
    flexDirection: "row",
  },
  monthButton: {
    padding: 4,
    marginLeft: 8,
  },
  calendarDays: {
    paddingHorizontal: 8,
  },
  dayItem: {
    width: 60,
    height: 75,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
    borderRadius: 12,
  },
  selectedDay: {
    backgroundColor: "#3b82f6",
  },
  dayText: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 6,
  },
  selectedDayText: {
    color: "#ffffff",
  },
  dateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  selectedDateText: {
    color: "#ffffff",
  },
  todayText: {
    color: "#3b82f6",
  },
  todayIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3b82f6",
    marginTop: 4,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tab: {
    marginRight: 24,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#3b82f6",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#64748b",
  },
  activeTabText: {
    color: "#3b82f6",
    fontWeight: "600",
  },
  badge: {
    backgroundColor: "#ef4444",
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "bold",
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  sessionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sessionInfo: {
    flex: 1,
    marginRight: 12,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 6,
  },
  sessionMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  sessionMetaIcon: {
    marginRight: 4,
  },
  sessionMetaText: {
    fontSize: 13,
    color: "#64748b",
  },
  sessionDuration: {
    fontSize: 13,
    color: "#64748b",
    marginLeft: 4,
  },
  sessionTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  onlineBadge: {
    backgroundColor: "#e0f2fe",
  },
  inPersonBadge: {
    backgroundColor: "#ecfdf5",
  },
  sessionTypeBadgeText: {
    fontSize: 12,
    marginLeft: 4,
  },
  onlineBadgeText: {
    color: "#0369a1",
  },
  inPersonBadgeText: {
    color: "#047857",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  locationIcon: {
    marginRight: 4,
  },
  locationText: {
    fontSize: 13,
    color: "#64748b",
  },
  sessionHost: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    marginBottom: 12,
  },
  hostAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  hostLabel: {
    fontSize: 12,
    color: "#64748b",
  },
  hostName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1e293b",
  },
  sessionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  participantsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  participantsIcon: {
    marginRight: 4,
  },
  participantsText: {
    fontSize: 13,
    color: "#64748b",
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
  },
  requestCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  requesterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requesterName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 2,
  },
  requestTitle: {
    fontSize: 14,
    color: "#64748b",
  },
  requestMessage: {
    fontSize: 14,
    color: "#1e293b",
    lineHeight: 20,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  requestMeta: {
    marginBottom: 16,
  },
  requestTimeInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  requestMetaIcon: {
    marginRight: 4,
  },
  requestMetaText: {
    fontSize: 13,
    color: "#64748b",
  },
  requestDuration: {
    fontSize: 13,
    color: "#64748b",
    marginLeft: 4,
  },
  requestActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  declineButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
  },
  acceptButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
  },
});
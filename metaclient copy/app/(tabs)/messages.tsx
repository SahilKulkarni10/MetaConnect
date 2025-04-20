import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { useAuth } from "../contexts/AuthContext";
import { getConversations, getMessagesWithUser, sendMessage as apiSendMessage } from "../utils/api";
import socketUtils from "../utils/socket";
import { formatDistanceToNow } from 'date-fns';

export default function MessagesScreen() {
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChat, setActiveChat] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesScrollRef = useRef(null);
  
  // Format timestamp to relative time (e.g., "2 hours ago")
  const formatMessageTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return timestamp;
    }
  };

  // Get default avatar for users without one
  const getDefaultAvatar = (index = 1) => {
    const avatars = [
      require("../../assets/images/avatars/avatar1.png"),
      require("../../assets/images/avatars/avatar2.png"),
      require("../../assets/images/avatars/avatar3.png"),
      require("../../assets/images/avatars/avatar4.png"),
    ];
    return avatars[(index - 1) % avatars.length];
  };

  // Load conversations when component mounts
  useEffect(() => {
    loadConversations();
    
    // Listen for new direct messages
    const unsubscribe = socketUtils.onDirectMessage((message) => {
      // If we're currently viewing this conversation, add the message
      if (activeChat && 
          (activeChat._id === message.sender || activeChat._id === message.recipient)) {
        setMessages((prevMessages) => [...prevMessages, message]);
        
        // Mark the message as read if we're the recipient
        if (message.recipient === currentUser?._id && !message.read) {
          socketUtils.markMessageAsRead(message._id);
        }
        
        // Scroll to bottom on new message
        setTimeout(() => {
          messagesScrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        // Update conversations list with new message
        loadConversations();
      }
    });
    
    return () => unsubscribe();
  }, [activeChat, currentUser]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      messagesScrollRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, [messages]);
  
  // Fetch all conversations
  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await getConversations();
      
      // Process conversations to include avatar and format timestamps
      const processedConversations = data.map((conv, index) => ({
        ...conv,
        user: {
          ...conv.user,
          avatar: conv.user.avatar ? { uri: conv.user.avatar } : getDefaultAvatar(index + 1),
          isOnline: Math.random() > 0.5, // Placeholder for online status
        },
        lastMessage: {
          ...conv.lastMessage,
          time: formatMessageTime(conv.lastMessage.createdAt),
        }
      }));
      
      setConversations(processedConversations);
    } catch (error) {
      Alert.alert("Error", "Failed to load conversations");
      console.error("Failed to load conversations:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Load messages for a specific conversation
  const loadMessages = async (userId) => {
    try {
      setLoading(true);
      const data = await getMessagesWithUser(userId);
      setMessages(data);
    } catch (error) {
      Alert.alert("Error", "Failed to load messages");
      console.error("Failed to load messages:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Send a new message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChat || sending) return;
    
    try {
      setSending(true);
      const recipientId = activeChat._id;
      const messageText = newMessage.trim();
      
      // Send message through API only - the backend will handle the socket event
      const sentMessage = await apiSendMessage(recipientId, messageText);
      
      // Add the new message to the local state
      setMessages(prevMessages => [...prevMessages, sentMessage]);
      
      // Update the conversations list
      loadConversations();
      
      // Clear input
      setNewMessage("");
      
      // Scroll to bottom
      setTimeout(() => {
        messagesScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      Alert.alert("Error", "Failed to send message");
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };
  
  // Handle selecting a conversation
  const handleSelectChat = (conversation) => {
    setActiveChat(conversation);
    loadMessages(conversation._id);
  };

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conv => 
    conv.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderChatItem = ({ item, index }) => (
    <Animated.View entering={FadeIn.delay(index * 50)}>
      <TouchableOpacity 
        style={[
          styles.chatItem, 
          activeChat && activeChat._id === item._id && styles.activeChatItem
        ]}
        onPress={() => handleSelectChat(item)}
      >
        <View style={styles.avatarContainer}>
          <Image source={item.user.avatar} style={styles.avatar} />
          {item.user.isOnline && <View style={styles.onlineIndicator} />}
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.username}>{item.user.name}</Text>
            <Text style={styles.timeText}>{item.lastMessage.time}</Text>
          </View>
          <Text 
            style={[
              styles.lastMessage, 
              item.unreadCount > 0 && styles.unreadMessage
            ]} 
            numberOfLines={1}
          >
            {item.lastMessage.text}
          </Text>
        </View>
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  // Determine if a message was sent by the current user
  const isMyMessage = (msg) => {
    return msg.sender === currentUser?._id;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="create-outline" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {!activeChat ? (
        <>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search conversations"
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.tabSelector}>
            <TouchableOpacity style={[styles.tab, styles.activeTab]}>
              <Text style={[styles.tabText, styles.activeTabText]}>Messages</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tab}>
              <Text style={styles.tabText}>Requests</Text>
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>3</Text>
              </View>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : (
            <FlatList
              data={filteredConversations}
              renderItem={renderChatItem}
              keyExtractor={(item) => item._id.toString()}
              contentContainerStyle={styles.chatList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubble-ellipses-outline" size={60} color="#cbd5e1" />
                  <Text style={styles.emptyText}>No conversations yet</Text>
                  <Text style={styles.emptySubtext}>Start a new conversation with someone from the community</Text>
                </View>
              }
            />
          )}
        </>
      ) : (
        <View style={styles.chatContainer}>
          <View style={styles.chatHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => {
                setActiveChat(null);
                setMessages([]);
              }}
            >
              <Ionicons name="chevron-back" size={24} color="#3b82f6" />
            </TouchableOpacity>
            <View style={styles.activeChatInfo}>
              <View style={styles.activeChatUser}>
                <Image 
                  source={activeChat?.user.avatar} 
                  style={styles.activeChatAvatar} 
                />
                <View>
                  <Text style={styles.activeChatName}>{activeChat?.user.name}</Text>
                  <Text style={styles.activeChatStatus}>
                    {activeChat?.user.isOnline ? "Online" : "Offline"}
                  </Text>
                </View>
              </View>
              <View style={styles.chatActions}>
                <TouchableOpacity style={styles.chatAction}>
                  <Ionicons name="call-outline" size={20} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.chatAction}>
                  <Ionicons name="videocam-outline" size={20} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.chatAction}>
                  <Ionicons name="ellipsis-vertical" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : (
            <ScrollView 
              ref={messagesScrollRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
            >
              {messages.length === 0 ? (
                <View style={styles.emptyMessagesContainer}>
                  <Ionicons name="chatbubble-outline" size={50} color="#cbd5e1" />
                  <Text style={styles.emptyMessagesText}>No messages yet</Text>
                  <Text style={styles.emptyMessagesSubtext}>Start a conversation with {activeChat?.user.name}</Text>
                </View>
              ) : (
                messages.map((message, index) => (
                  <View 
                    key={message._id.toString()}
                    style={[
                      styles.messageWrapper,
                      isMyMessage(message) ? styles.myMessageWrapper : styles.theirMessageWrapper
                    ]}
                  >
                    {!isMyMessage(message) && (
                      <Image source={activeChat?.user.avatar} style={styles.messageAvatar} />
                    )}
                    <View 
                      style={[
                        styles.messageBubble,
                        isMyMessage(message) ? styles.myMessage : styles.theirMessage
                      ]}
                    >
                      <Text style={[
                        styles.messageText,
                        isMyMessage(message) ? styles.myMessageText : styles.theirMessageText
                      ]}>
                        {message.text}
                      </Text>
                      <Text style={[
                        styles.messageTime,
                        isMyMessage(message) ? styles.myMessageTime : styles.theirMessageTime
                      ]}>
                        {formatMessageTime(message.createdAt)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}

          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.inputAction}>
              <Ionicons name="attach-outline" size={24} color="#64748b" />
            </TouchableOpacity>
            <TextInput
              style={styles.messageInput}
              placeholder="Type a message..."
              placeholderTextColor="#94a3b8"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              disabled={sending}
            />
            <TouchableOpacity 
              style={[
                styles.sendButton,
                (newMessage.length > 0 && !sending) ? styles.activeSendButton : {}
              ]}
              onPress={handleSendMessage}
              disabled={newMessage.length === 0 || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons 
                  name="send" 
                  size={20} 
                  color={(newMessage.length > 0) ? "#ffffff" : "#94a3b8"} 
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ...existing styles...
  
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 16,
    fontFamily: "Inter-SemiBold",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 8,
    fontFamily: "Inter-Regular",
  },
  emptyMessagesContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyMessagesText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 16,
    fontFamily: "Inter-SemiBold",
  },
  emptyMessagesSubtext: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 8,
    fontFamily: "Inter-Regular",
  },
  myMessageText: {
    color: "#ffffff",
  },
  theirMessageText: {
    color: "#1e293b",
  },
  myMessageTime: {
    color: "#e0e7ff",
  },
  theirMessageTime: {
    color: "#94a3b8",
  },
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
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    fontFamily: "Inter-Bold",
  },
  headerIcon: {
    padding: 6,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    height: 36,
    fontSize: 15,
    color: "#1e293b",
    fontFamily: "Inter-Regular",
  },
  tabSelector: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 24,
    paddingBottom: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#3b82f6",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748b",
    fontFamily: "Inter-SemiBold",
  },
  activeTabText: {
    color: "#3b82f6",
  },
  tabBadge: {
    backgroundColor: "#ef4444",
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  tabBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: "Inter-Bold",
  },
  chatList: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activeChatItem: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10b981",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  username: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
    fontFamily: "Inter-SemiBold",
  },
  timeText: {
    fontSize: 12,
    color: "#94a3b8",
    fontFamily: "Inter-Regular",
  },
  lastMessage: {
    fontSize: 14,
    color: "#64748b",
    fontFamily: "Inter-Regular",
  },
  unreadMessage: {
    fontWeight: "600",
    color: "#1e293b",
    fontFamily: "Inter-SemiBold",
  },
  unreadBadge: {
    backgroundColor: "#3b82f6",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: "Inter-Bold",
  },
  chatContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  chatHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backButton: {
    marginBottom: 16,
  },
  activeChatInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activeChatUser: {
    flexDirection: "row",
    alignItems: "center",
  },
  activeChatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  activeChatName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    fontFamily: "Inter-SemiBold",
  },
  activeChatStatus: {
    fontSize: 13,
    color: "#64748b",
    fontFamily: "Inter-Regular",
  },
  chatActions: {
    flexDirection: "row",
  },
  chatAction: {
    marginLeft: 16,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 30, // Extra padding at bottom
  },
  messageWrapper: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  myMessageWrapper: {
    justifyContent: "flex-end",
  },
  theirMessageWrapper: {
    justifyContent: "flex-start",
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    maxWidth: "75%",
  },
  myMessage: {
    backgroundColor: "#3b82f6",
  },
  theirMessage: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter-Regular",
  },
  messageTime: {
    fontSize: 11,
    marginTop: 6,
    alignSelf: "flex-end",
    fontFamily: "Inter-Regular",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  inputAction: {
    marginRight: 8,
  },
  messageInput: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    color: "#1e293b",
    fontFamily: "Inter-Regular",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  activeSendButton: {
    backgroundColor: "#3b82f6",
  },
});
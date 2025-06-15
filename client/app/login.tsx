import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  StatusBar,
  SafeAreaView,
  ViewStyle,
  Alert,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAuth } from "./contexts/AuthContext";
import { colors, fonts, spacing } from "./constants/theme";
import api from "./utils/api";
import NetworkConfig from "./components/NetworkConfig";

export default function LoginScreen() {
  const router = useRouter();
  const { login, error: authError, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { height } = useWindowDimensions();
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate dynamic top padding based on screen height
  const dynamicTopPadding = Math.max(height * 0.03, 20);

  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      setIsLoading(true);
      await login(email, password);
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert(
        "Login Failed",
        error.response?.data?.message || "An error occurred during login"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const navigateTo = (path: string) => {
    router.push(path as any);
  };

  // Create dynamic container style
  const dynamicContainerStyle: ViewStyle = {
    flexGrow: 1,
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    paddingTop: dynamicTopPadding,
    paddingBottom: 40,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "#ffffff" }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={dynamicContainerStyle}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={styles.logoContainer}
          >
            <Image
              source={require("../assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appName}>MetaConnect</Text>
            <Text style={styles.tagline}>
              Connect, Collaborate, Create
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(400).springify()}
            style={styles.formContainer}
          >
            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.subtitle}>Log in to your account</Text>

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={18} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#64748b"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#64748b"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.configButton}
                onPress={() => setShowNetworkModal(true)}
              >
                <Ionicons name="settings-outline" size={18} color="#64748b" />
                <Text style={styles.configButtonText}>Network Config</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.loginButton,
                (authLoading || !email || !password) && styles.disabledButton,
              ]}
              onPress={handleLogin}
              disabled={authLoading || !email || !password}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Log In</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(1000).springify()}
            style={styles.signupContainer}
          >
            <Text style={styles.signupText}>Don't have an account? </Text>
            <Link href="/signup" asChild>
              <TouchableOpacity>
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Network Configuration Modal */}
      <NetworkConfig
        visible={showNetworkModal}
        onClose={() => setShowNetworkModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  appName: {
    fontSize: 26,
    ...fonts.bold,
    color: "#1e293b",
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    ...fonts.regular,
    color: "#64748b",
    textAlign: "center",
  },
  formContainer: {
    width: "100%",
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 28,
    ...fonts.bold,
    color: "#1e293b",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    ...fonts.regular,
    color: "#64748b",
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 60,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 60,
    fontSize: 16,
    color: "#1e293b",
  },
  passwordToggle: {
    padding: 10,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  configButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
  },
  configButtonText: {
    fontSize: 15,
    color: "#64748b",
    marginLeft: 5,
  },
  forgotPassword: {
    padding: 4,
  },
  forgotPasswordText: {
    fontSize: 15,
    color: "#3b82f6",
    fontWeight: "500",
  },
  loginButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 16,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: "#93c5fd",
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#ffffff",
  },
  orContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  orText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  socialContainer: {
    marginBottom: 24,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    height: 60,
    marginBottom: 16,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1e293b",
    marginLeft: 12,
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingTop: 8,
    paddingBottom: 12,
  },
  signupText: {
    fontSize: 15,
    color: "#64748b",
  },
  signupLink: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3b82f6",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: "#ef4444",
    marginLeft: 8,
  },
});
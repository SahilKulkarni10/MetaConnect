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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAuth } from "./contexts/AuthContext";

export default function SignupScreen() {
  const router = useRouter();
  const { signup, error: authError, isLoading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  
  // Sample skills
  const skillOptions = [
    "React Native",
    "JavaScript",
    "Python",
    "UI/UX Design",
    "Node.js",
    "Flutter",
    "AWS",
    "DevOps",
  ];
  
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (selectedSkills.length === 0) {
      setError("Please select at least one skill");
      return;
    }

    try {
      await signup(name, email, password, selectedSkills);
    } catch (err) {
      // Error is handled in the auth context
    }
  };

  const goToNextStep = () => {
    if (
      !name || !email || !password || !confirmPassword
    ) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError(null);
    setStep(2);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#ffffff" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView contentContainerStyle={styles.container}>
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
            Join the community of tech collaborators
          </Text>
        </Animated.View>

        {step === 1 ? (
          <Animated.View 
            entering={FadeInDown.delay(400).springify()}
            style={styles.formContainer}
          >
            <Text style={styles.welcomeText}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started</Text>

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={18} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
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

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#94a3b8"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.continueButton,
                (!name || !email || !password || !confirmPassword || password !== confirmPassword) &&
                  styles.disabledButton,
              ]}
              onPress={goToNextStep}
              disabled={!name || !email || !password || !confirmPassword || password !== confirmPassword}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View 
            entering={FadeInDown.delay(400).springify()}
            style={styles.formContainer}
          >
            <Text style={styles.welcomeText}>Your Skills</Text>
            <Text style={styles.subtitle}>Select skills you can share or want to learn</Text>

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={18} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.skillsContainer}>
              {skillOptions.map((skill) => (
                <TouchableOpacity
                  key={skill}
                  style={[
                    styles.skillChip,
                    selectedSkills.includes(skill) && styles.selectedSkillChip,
                  ]}
                  onPress={() => toggleSkill(skill)}
                >
                  <Text
                    style={[
                      styles.skillText,
                      selectedSkills.includes(skill) && styles.selectedSkillText,
                    ]}
                  >
                    {skill}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.stepIndicator}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setStep(1)}
              >
                <Ionicons name="chevron-back" size={20} color="#3b82f6" />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <View style={styles.dots}>
                <View style={[styles.dot, step === 1 && styles.activeDot]} />
                <View style={[styles.dot, step === 2 && styles.activeDot]} />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.signupButton, 
                (authLoading || selectedSkills.length === 0) && styles.disabledButton
              ]}
              onPress={handleSignup}
              disabled={authLoading || selectedSkills.length === 0}
            >
              {authLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.signupButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}

        <Animated.View 
          entering={FadeInDown.delay(600).springify()}
          style={styles.loginContainer}
        >
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push("login")}>
            <Text style={styles.loginLink}>Log In</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
    fontFamily: "Inter-Bold",
  },
  tagline: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    fontFamily: "Inter-Regular",
  },
  formContainer: {
    width: "100%",
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1e293b",
    fontFamily: "Inter-Bold",
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 24,
    fontFamily: "Inter-Regular",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 56,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: "#1e293b",
    fontFamily: "Inter-Regular",
  },
  passwordToggle: {
    padding: 8,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: "#ef4444",
    marginLeft: 8,
  },
  continueButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 24,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    fontFamily: "Inter-SemiBold",
  },
  signupButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 24,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    fontFamily: "Inter-SemiBold",
  },
  disabledButton: {
    backgroundColor: "#93c5fd",
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  skillChip: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 10,
    margin: 6,
  },
  selectedSkillChip: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  skillText: {
    fontSize: 14,
    color: "#64748b",
    fontFamily: "Inter-Medium",
  },
  selectedSkillText: {
    color: "#ffffff",
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 24,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 14,
    color: "#3b82f6",
    marginLeft: 4,
    fontFamily: "Inter-Medium",
  },
  dots: {
    flexDirection: "row",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: "#3b82f6",
    width: 16,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  loginText: {
    fontSize: 14,
    color: "#64748b",
    fontFamily: "Inter-Regular",
  },
  loginLink: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3b82f6",
    fontFamily: "Inter-SemiBold",
  },
});
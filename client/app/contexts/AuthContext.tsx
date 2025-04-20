import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../utils/api";

type UserType = {
  _id: string;
  name: string;
  email: string;
  skills: string[];
  bio: string;
  location: string;
  availability: boolean;
  avatar: string;
};

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserType | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    name: string,
    email: string,
    password: string,
    skills?: string[]
  ) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  updateUser: (userData: Partial<UserType>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Load user from storage on app start
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (token) {
          // Validate token and get user data
          try {
            const response = await api.get("/auth/me");
            setUser(response.data.data);
            setIsAuthenticated(true);
          } catch (err) {
            // Token is invalid, clear it
            await AsyncStorage.removeItem("token");
          }
        }
      } catch (err) {
        console.error("Error loading user:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.post("/auth/login", {
        email,
        password
      });

      const { token, user } = response.data;
      
      // Save token to storage
      await AsyncStorage.setItem("token", token);
      
      // Set user and authentication state
      setUser(user);
      setIsAuthenticated(true);
      
      // Navigate to home screen
      router.replace("/(tabs)/home");
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "An error occurred during login";
      setError(errorMessage);
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    skills: string[] = []
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post("/auth/register", {
        name,
        email,
        password,
        skills
      });

      const { token, user } = response.data;
      
      // Save token to storage
      await AsyncStorage.setItem("token", token);
      
      // Set user and authentication state
      setUser(user);
      setIsAuthenticated(true);
      
      // Navigate to home screen
      router.replace("/(tabs)/home");
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "An error occurred during sign up";
      setError(errorMessage);
      console.error("Sign up error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Clear token from storage
      await AsyncStorage.removeItem("token");
      
      // Reset state
      setUser(null);
      setIsAuthenticated(false);
      
      // Navigate to login screen
      router.replace("/login");
    } catch (err: any) {
      setError("An error occurred during logout");
      console.error("Logout error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (userData: Partial<UserType>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      const response = await api.put(`/users/${user._id}`, userData);
      
      // Update user state with new data
      setUser(response.data.data);
      
      return response.data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "An error occurred while updating profile";
      setError(errorMessage);
      console.error("Update user error:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        signup,
        logout,
        error,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Add default export
export default AuthProvider;
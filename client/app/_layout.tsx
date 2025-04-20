import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Text } from "react-native";
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import socketUtils from "./utils/socket";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some race conditions, ignore them */
});

export default function RootLayout() {
  const [fontLoadingAttempted, setFontLoadingAttempted] = useState(false);
  
  // Try loading fonts with error handling
  const [loaded, error] = useFonts({
    // Use require to ensure file existence is checked at build time
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Separate useEffect for font loading error handling
  useEffect(() => {
    if (error) {
      console.log("Font loading error:", error);
      // Mark fonts as attempted even if they failed
      setFontLoadingAttempted(true);
    }
  }, [error]);

  // Initialize socket connection when app loads
  useEffect(() => {
    const setupSocket = async () => {
      await socketUtils.initializeSocket();
    };
    
    setupSocket();
    
    // Cleanup socket on unmount
    return () => {
      socketUtils.disconnectSocket();
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (loaded || fontLoadingAttempted) {
      await SplashScreen.hideAsync();
    }
  }, [loaded, fontLoadingAttempted]);

  // If fonts are still loading and no error yet, wait
  if (!loaded && !fontLoadingAttempted) {
    return null;
  }

  return (
    <AuthProvider>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <StatusBar style="dark" />
        {error && __DEV__ && (
          <View style={{ backgroundColor: '#FFFF00', padding: 5, alignItems: 'center' }}>
            <Text>Font loading issues detected - using system fonts</Text>
          </View>
        )}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#f0f4f8" },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen 
            name="login" 
            options={{
              title: "Login",
              headerShown: true,
              headerTitleStyle: {
                fontWeight: "600",
              },
              headerTitleAlign: "center",
            }}
          />
          <Stack.Screen 
            name="signup" 
            options={{
              title: "Sign Up",
              headerShown: true,
              headerTitleStyle: {
                fontWeight: "600",
              },
              headerTitleAlign: "center",
            }}
          />
          <Stack.Screen 
            name="(tabs)" 
            options={{
              headerShown: false,
            }}
          />
        </Stack>
      </View>
    </AuthProvider>
  );
}
// import { useEffect } from "react";
// import { View, ActivityIndicator } from "react-native";
// import { useRouter } from "expo-router";
// import { useAuth } from "./contexts/AuthContext";

// export default function Index() {
//   const router = useRouter();
//   const { isAuthenticated, isLoading } = useAuth();

//   useEffect(() => {
//     if (!isLoading) {
//       if (isAuthenticated) {
//         router.replace("/(tabs)/home");
//       } else {
//         router.replace("/login");
//       }
//     }
//   }, [isLoading, isAuthenticated, router]);

//   return (
//     <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
//       <ActivityIndicator size="large" color="#3b82f6" />
//     </View>
//   );
// }


import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "./contexts/AuthContext"; // Fixed import alias

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      // Prevent potential race conditions
      const route = isAuthenticated ? "/(tabs)/home" : "/login";
      // Replace current route to avoid back navigation
      router.replace(route);
    }
  }, [isLoading, isAuthenticated]);

  // Show loading indicator while checking auth state
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );
}
import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { UserProvider, useUser } from "../context/UserContext";
import { LanguageProvider } from "../context/LanguageContext";
import { useEffect, useRef } from "react";
import AppLoader from "../components/apploader";

function NavigationGuard() {
  const { authState } = useUser();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (authState.isLoading) return;

    // Check if current route is within protected or public areas
    const routeSegments = segments as string[];
    const routePath = routeSegments.join("/");
    const inProtectedArea = routePath.includes("(tabs)") || routePath.includes("verification") || routePath.includes("kyc");
    const inAuthFlow = routePath.includes("otp") || routePath.includes("register");
    const isLoginScreen = routeSegments.length === 0 || routePath === "index" || routePath === "login";

    if (!authState.isLoggedIn && inProtectedArea) {
        router.replace("/login");
    } else if (authState.isLoggedIn && isLoginScreen && !inAuthFlow) {
        // Logged in but on login screen (not in auth flow) -> go to app
        router.replace("/(tabs)");
    }
  }, [authState.isLoggedIn, authState.isLoading, segments]);

  if (authState.isLoading) {
    return <AppLoader />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <UserProvider>
        <LanguageProvider>
          <NavigationGuard />
        </LanguageProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
}
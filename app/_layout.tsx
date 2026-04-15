import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UserProvider, useUser } from '../context/UserContext';
import { LanguageProvider } from '../context/LanguageContext';
import { ThemeProvider } from '../context/ThemeContext';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppLoader from '../components/apploader';

function NavigationGuard() {
  const { authState } = useUser();
  const segments = useSegments();
  const router = useRouter();
  const [permissionsChecked, setPermissionsChecked] = useState(false);
  const [needsPermissions, setNeedsPermissions] = useState(false);

  // Check first-launch permissions flag once
  useEffect(() => {
    AsyncStorage.getItem('@anusha_permissions_shown').then((val) => {
      setNeedsPermissions(!val);
      setPermissionsChecked(true);
    });
  }, []);

  useEffect(() => {
    if (authState.isLoading || !permissionsChecked) return;

    const routeSegments = segments as string[];
    const routePath = routeSegments.join('/');
    const onPermissionsScreen = routePath.includes('permissions');
    const inProtectedArea =
      routePath.includes('(tabs)') ||
      routePath.includes('verification') ||
      routePath.includes('kyc');
    const inAuthFlow =
      routePath.includes('otp') || routePath.includes('register');
    const isRootOrLogin =
      routeSegments.length === 0 ||
      routePath === 'index' ||
      routePath === 'login';

    // First launch — show permissions before anything else
    if (needsPermissions && !onPermissionsScreen) {
      setNeedsPermissions(false); // prevent re-trigger
      router.replace('/permissions');
      return;
    }

    // Auth guard
    if (!authState.isLoggedIn && inProtectedArea) {
      router.replace('/login');
    } else if (authState.isLoggedIn && isRootOrLogin && !inAuthFlow) {
      router.replace('/(tabs)');
    }
  }, [authState.isLoggedIn, authState.isLoading, segments, permissionsChecked, needsPermissions]);

  if (authState.isLoading || !permissionsChecked) {
    return <AppLoader />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <UserProvider>
          <LanguageProvider>
            <NavigationGuard />
          </LanguageProvider>
        </UserProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

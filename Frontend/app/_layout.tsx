import "@/polyfill-localstorage";
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
// Removed unused expo-font import
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useRef } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemeProvider as AppThemeProvider } from '@/context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { API_BASE_URL } from '@/constants/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, // Fix type error
    shouldShowList: true, // Fix type error
  }),
});
import { ActivityIndicator, View } from "react-native";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const loaded = true; // Use system fonts instead of missing custom font
  const [isReady, setIsReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const [expoPushToken, setExpoPushToken] = useState('');
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'web') {
      return;
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log("Expo Push Token:", token);
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  }

  const sendTokenToBackend = async (token: string) => {
    try {
      const authToken = await AsyncStorage.getItem("token");
      if (!authToken) return;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

      await fetch(`${API_BASE_URL}/profile/push-token`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ token, timezone })
      });
    } catch (error) {
      console.error("Failed to send push token", error);
    }
  };

  useEffect(() => {
    if (loaded) {
      checkAuth(); // Call checkAuth after fonts are loaded

      registerForPushNotificationsAsync().then(token => {
        if (token) {
          setExpoPushToken(token);
          sendTokenToBackend(token);
        }
      });

      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        // Handle received notification
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        if (data?.route) {
          router.push(data.route as any);
        }
      });

      return () => {
        if (notificationListener.current) notificationListener.current.remove(); // Fix deprecated method
        if (responseListener.current) responseListener.current.remove(); // Fix deprecated method
      };
    }
  }, [loaded]);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const user = await AsyncStorage.getItem("user");

      if (token && user) {
        // User is logged in, redirect to tabs
        // We use router.replace inside a timeout to ensure navigation is ready
        setTimeout(() => {
          router.replace("/(tabs)");
          SplashScreen.hideAsync();
        }, 100);
      } else {
        // User not logged in, redirect to auth
        setTimeout(() => {
          router.replace("/auth");
          SplashScreen.hideAsync();
        }, 100);
      }
    } catch (e) {
      console.error("Auth check failed", e);
      SplashScreen.hideAsync();
    } finally {
      setIsReady(true);
    }
  };

  if (!loaded || !isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppThemeProvider>
        <Stack
          screenOptions={{
            animation: "fade",
            contentStyle: { backgroundColor: "#F2F4F8" },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth/index" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}

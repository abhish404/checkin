import { API_BASE_URL } from "@/constants/api";
import { Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { makeRedirectUri } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors, width), [colors, width]);

  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [googleMessage, setGoogleMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loginMessage, setLoginMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: "728497750384-i2odpp36reh028ts0kqijh1bp3bmisim.apps.googleusercontent.com",
    iosClientId: "YOUR_IOS_CLIENT_ID",
    webClientId: "728497750384-78jtkoio2td111a4i2pgfuith4hnnd1j.apps.googleusercontent.com",
    redirectUri: makeRedirectUri({ scheme: "checkinin" }),
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      const idToken = authentication?.idToken;
      const accessToken = authentication?.accessToken;
      if (idToken || accessToken) {
        handleGoogleLogin({ idToken, accessToken });
      }
    }
  }, [response]);

  const handleGoogleLogin = async ({
    idToken,
    accessToken,
  }: { idToken?: string; accessToken?: string }) => {
    setLoading(true);
    try {
      const body = idToken ? { token: idToken } : { accessToken };
      const res = await fetch(`${API_BASE_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (json.success) {
        setGoogleMessage({ type: "success", text: "Logged in successfully!" });
        await AsyncStorage.setItem("token", json.token);
        await AsyncStorage.setItem("user", JSON.stringify(json.user));
        setTimeout(() => router.replace("/(tabs)"), 300);
      } else {
        setGoogleMessage({ type: "error", text: json.message || "Unknown error" });
      }
    } catch {
      setGoogleMessage({ type: "error", text: "Could not connect to backend. Check your network." });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    setLoginMessage(null);
    if (!email.trim() || !password) {
      setLoginMessage({ type: "error", text: "Please enter email and password" });
      return;
    }
    setLoginLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      let json;
      try {
        json = await res.json();
      } catch {
        setLoginMessage({ type: "error", text: "Server error. Please try again." });
        setLoginLoading(false);
        return;
      }

      if (json.success) {
        setLoginMessage({ type: "success", text: "Logged in successfully!" });
        await AsyncStorage.setItem("token", json.token);
        await AsyncStorage.setItem("user", JSON.stringify(json.user));
        setTimeout(() => router.replace("/(tabs)"), 300);
      } else {
        setLoginMessage({ type: "error", text: json.message || "Login failed" });
      }
    } catch {
      setLoginMessage({ type: "error", text: "Network error. Please check your connection." });
    } finally {
      setLoginLoading(false);
    }
  };

  const isWide = width >= 700;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.splitContainer, !isWide && styles.splitColumn]}>
          {/* LEFT: Google Sign Up / Continue with Google */}
          <View style={[styles.panel, styles.leftPanel]}>
            <View style={styles.iconContainer}>
              <Ionicons name="location" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Checkin'in</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              New here? Sign up with Google
            </Text>
            {googleMessage && (
              <View style={[
                styles.messageBanner,
                googleMessage.type === "error" ? { backgroundColor: colors.error + "20", borderColor: colors.error } : { backgroundColor: colors.success + "20", borderColor: colors.success }
              ]}>
                <Ionicons name={googleMessage.type === "error" ? "alert-circle" : "checkmark-circle"} size={18} color={googleMessage.type === "error" ? colors.error : colors.success} />
                <Text style={[styles.messageText, { color: googleMessage.type === "error" ? colors.error : colors.success }]}>{googleMessage.text}</Text>
              </View>
            )}
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: Spacing.lg }} />
            ) : (
              <TouchableOpacity
                style={[styles.googleButton, !request && styles.disabledButton]}
                disabled={!request}
                onPress={() => promptAsync()}
              >
                <Ionicons name="logo-google" size={22} color="#FFF" style={{ marginRight: 10 }} />
                <Text style={styles.googleText}>Continue with Google</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* RIGHT: Login with Email & Password */}
          <View style={[styles.panel, styles.rightPanel]}>
            <Text style={[styles.loginTitle, { color: colors.textPrimary }]}>
              Already a user?
            </Text>
            <Text style={[styles.loginSubtitle, { color: colors.textSecondary }]}>
              Log in with your email and password
            </Text>

            {loginMessage && (
              <View style={[
                styles.messageBanner,
                loginMessage.type === "error" ? { backgroundColor: colors.error + "20", borderColor: colors.error } : { backgroundColor: colors.success + "20", borderColor: colors.success }
              ]}>
                <Ionicons name={loginMessage.type === "error" ? "alert-circle" : "checkmark-circle"} size={18} color={loginMessage.type === "error" ? colors.error : colors.success} />
                <Text style={[styles.messageText, { color: loginMessage.type === "error" ? colors.error : colors.success }]}>{loginMessage.text}</Text>
              </View>
            )}

            <View style={styles.form}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary }]}
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={(t) => { setEmail(t); setLoginMessage(null); }}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={[styles.label, { color: colors.textPrimary }]}>Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary }]}
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={(t) => { setPassword(t); setLoginMessage(null); }}
                secureTextEntry
              />

              <TouchableOpacity
                onPress={() => router.push("/auth/forgot-password")}
                style={styles.forgotLink}
              >
                <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.loginButton, { backgroundColor: colors.primary }]}
                onPress={handleEmailLogin}
                disabled={loginLoading}
              >
                {loginLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>Log In</Text>
                )}
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                  Don't have an account?{" "}
                </Text>
                <TouchableOpacity onPress={() => router.push("/auth/signup")}>
                  <Text style={[styles.link, { color: colors.primary }]}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any, width: number) => {
  const isWide = width >= 700;
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      padding: Spacing.lg,
      justifyContent: "center",
      minHeight: "100%",
    },
    splitContainer: {
      flexDirection: isWide ? "row" : "column",
      alignItems: "stretch",
      gap: Spacing.xl,
      maxWidth: 900,
      alignSelf: "center",
      width: "100%",
    },
    splitColumn: {
      flexDirection: "column",
    },
    panel: {
      flex: 1,
      minWidth: isWide ? 320 : undefined,
      justifyContent: "center",
      paddingVertical: Spacing.xl,
    },
    leftPanel: {
      alignItems: "center",
      borderRightWidth: isWide ? 1 : 0,
      borderBottomWidth: isWide ? 0 : 1,
      borderColor: colors.border || "#E2E8F0",
      paddingRight: isWide ? Spacing.xl : 0,
      paddingBottom: isWide ? 0 : Spacing.xl,
    },
    rightPanel: {
      paddingLeft: isWide ? Spacing.xl : 0,
      paddingTop: isWide ? 0 : Spacing.lg,
    },
    iconContainer: {
      marginBottom: Spacing.md,
      padding: Spacing.md,
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.round,
      ...Shadows.medium,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      marginBottom: Spacing.xs,
    },
    subtitle: {
      fontSize: FontSize.sm,
      textAlign: "center",
      marginBottom: Spacing.lg,
    },
    googleButton: {
      flexDirection: "row",
      backgroundColor: "#DB4437",
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.lg,
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      maxWidth: 280,
      ...Shadows.small,
    },
    disabledButton: {
      opacity: 0.6,
    },
    googleText: {
      color: "#FFF",
      fontSize: FontSize.md,
      fontWeight: "600",
    },
    loginTitle: {
      fontSize: 22,
      fontWeight: "700",
      marginBottom: Spacing.xs,
    },
    loginSubtitle: {
      fontSize: FontSize.sm,
      marginBottom: Spacing.lg,
    },
    form: {
      gap: Spacing.md,
    },
    label: {
      fontSize: FontSize.sm,
      fontWeight: "600",
    },
    input: {
      padding: Spacing.md,
      borderRadius: BorderRadius.lg,
      fontSize: FontSize.md,
      ...Shadows.small,
    },
    forgotLink: {
      alignSelf: "flex-end",
    },
    forgotText: {
      fontSize: FontSize.sm,
      fontWeight: "500",
    },
    loginButton: {
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
      alignItems: "center",
      marginTop: Spacing.sm,
      ...Shadows.medium,
    },
    loginButtonText: {
      color: "#FFF",
      fontSize: FontSize.md,
      fontWeight: "700",
    },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: Spacing.md,
    },
    footerText: {
      fontSize: FontSize.sm,
    },
    link: {
      fontWeight: "600",
      fontSize: FontSize.sm,
    },
    messageBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: Spacing.md,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      marginBottom: Spacing.md,
    },
    messageText: {
      flex: 1,
      fontSize: FontSize.sm,
      fontWeight: "500",
    },
  });
};

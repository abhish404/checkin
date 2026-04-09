import { useState, useMemo } from "react";
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";
import { API_BASE_URL } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";

export default function SignupScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        age: "",
        email: "",
        password: "",
    });
    const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

    const handleSignup = async () => {
        setMessage(null);
        if (!formData.name || !formData.email || !formData.password || !formData.age) {
            setMessage({ type: "error", text: "Please fill in all fields" });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            let json;
            try {
                json = await res.json();
            } catch {
                setMessage({ type: "error", text: "Server error. Please try again." });
                setLoading(false);
                return;
            }

            if (json.success) {
                setMessage({ type: "success", text: "Account created! Signing you in..." });
                await AsyncStorage.setItem("token", json.token);
                await AsyncStorage.setItem("user", JSON.stringify(json.user));
                setTimeout(() => router.replace("/(tabs)"), 300);
            } else {
                setMessage({ type: "error", text: json.message || "Something went wrong" });
            }
        } catch {
            setMessage({ type: "error", text: "Network error. Please try again." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Join your circle today.</Text>
                    </View>

                    {message && (
                        <View style={[
                            styles.messageBanner,
                            message.type === "error" ? { backgroundColor: colors.error + "20", borderColor: colors.error } : { backgroundColor: colors.success + "20", borderColor: colors.success }
                        ]}>
                            <Ionicons name={message.type === "error" ? "alert-circle" : "checkmark-circle"} size={18} color={message.type === "error" ? colors.error : colors.success} />
                            <Text style={[styles.messageText, { color: message.type === "error" ? colors.error : colors.success }]}>{message.text}</Text>
                        </View>
                    )}

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.name}
                                onChangeText={(text) => setFormData({ ...formData, name: text })}
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Age</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.age}
                                onChangeText={(text) => setFormData({ ...formData, age: text })}
                                keyboardType="numeric"
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.email}
                                onChangeText={(text) => setFormData({ ...formData, email: text })}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.password}
                                onChangeText={(text) => setFormData({ ...formData, password: text })}
                                secureTextEntry
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>

                        <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Sign Up</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => router.push("/auth")}>
                                <Text style={styles.link}>Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        padding: Spacing.lg,
    },
    backButton: {
        marginBottom: Spacing.md,
    },
    header: {
        marginBottom: Spacing.xl,
    },
    title: {
        fontSize: FontSize.xxl,
        fontWeight: "800",
        color: colors.textPrimary,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: FontSize.md,
        color: colors.textSecondary,
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
    form: {
        gap: Spacing.lg,
    },
    inputGroup: {
        gap: Spacing.xs,
    },
    label: {
        fontSize: FontSize.sm,
        fontWeight: "600",
        color: colors.textPrimary,
    },
    input: {
        backgroundColor: colors.surface,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        fontSize: FontSize.md,
        color: colors.textPrimary,
        ...Shadows.small,
    },
    button: {
        backgroundColor: colors.primary,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        alignItems: "center",
        marginTop: Spacing.md,
        ...Shadows.medium,
    },
    buttonText: {
        color: "#fff",
        fontSize: FontSize.md,
        fontWeight: "700",
    },
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: Spacing.md,
    },
    footerText: {
        color: colors.textSecondary,
        fontSize: FontSize.md,
    },
    link: {
        color: colors.primary,
        fontWeight: "600",
        fontSize: FontSize.md,
    },
});

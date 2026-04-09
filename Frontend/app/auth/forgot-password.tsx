import { useState, useMemo } from "react";
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";
import { API_BASE_URL } from "@/constants/api";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

    const handleReset = async () => {
        setMessage(null);
        if (!email.trim()) {
            setMessage({ type: "error", text: "Please enter your email" });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim() }),
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
                setMessage({ type: "success", text: "Password reset link sent to your email. Check your inbox." });
            } else {
                setMessage({ type: "error", text: json.message || "Failed to send reset link" });
            }
        } catch {
            setMessage({ type: "error", text: "Network error. Please try again." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>

                <View style={styles.header}>
                    <Text style={styles.title}>Forgot Password</Text>
                    <Text style={styles.subtitle}>Enter your email to receive reset instructions.</Text>
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
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>

                    <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Send Reset Link</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
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
});

import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useState, useMemo } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "@/constants/api";

export default function SecurityScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async () => {
        if (!oldPassword || !newPassword) {
            Alert.alert("Error", "Please fill all fields");
            return;
        }

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/profile/change-password`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ oldPassword, newPassword })
            });
            const json = await res.json();

            if (json.success) {
                Alert.alert("Success", "Password updated successfully");
                setOldPassword("");
                setNewPassword("");
            } else {
                Alert.alert("Error", json.message || "Failed to update password");
            }
        } catch (error) {
            Alert.alert("Error", "Network error");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account",
            "Are you sure? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem("token");
                            await fetch(`${API_BASE_URL}/profile/delete`, {
                                method: "DELETE",
                                headers: { "Authorization": `Bearer ${token}` }
                            });
                            await AsyncStorage.clear();
                            router.replace("/auth");
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete account");
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Security</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <Text style={styles.sectionTitle}>CHANGE PASSWORD</Text>
                <View style={styles.card}>
                    <TextInput
                        style={styles.input}
                        value={oldPassword}
                        onChangeText={setOldPassword}
                        placeholder="Current Password"
                        secureTextEntry
                        placeholderTextColor={colors.textSecondary}
                    />
                    <View style={{ height: Spacing.md }} />
                    <TextInput
                        style={styles.input}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="New Password"
                        secureTextEntry
                        placeholderTextColor={colors.textSecondary}
                    />
                    <TouchableOpacity style={styles.button} onPress={handleChangePassword} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Update Password</Text>}
                    </TouchableOpacity>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.error, marginTop: Spacing.xl }]}>DANGER ZONE</Text>
                <View style={[styles.card, { borderColor: colors.error, borderWidth: 1 }]}>
                    <Text style={styles.dangerText}>Deleting your account will remove all your data, friends, and check-in history permanently.</Text>
                    <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
                        <Text style={styles.deleteButtonText}>Delete Account</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background || '#121212',
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
    },
    headerTitle: {
        fontSize: FontSize.lg,
        fontWeight: "700",
        color: colors.textPrimary,
    },
    backButton: {
        padding: Spacing.xs,
    },
    content: {
        padding: Spacing.lg,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.textSecondary,
        marginBottom: Spacing.sm,
        marginLeft: Spacing.sm,
        letterSpacing: 1,
    },
    card: {
        backgroundColor: colors.surface,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        ...Shadows.small,
    },
    input: {
        backgroundColor: colors.background,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        color: colors.textPrimary,
    },
    button: {
        backgroundColor: colors.primary,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        marginTop: Spacing.lg
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600'
    },
    dangerText: {
        fontSize: FontSize.sm,
        color: colors.textSecondary,
        marginBottom: Spacing.lg,
        lineHeight: 20
    },
    deleteButton: {
        backgroundColor: colors.error,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center'
    },
    deleteButtonText: {
        color: '#fff',
        fontWeight: '600'
    }
});

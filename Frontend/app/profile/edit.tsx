import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useState, useMemo } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "@/constants/api";

export default function EditProfileScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [name, setName] = useState("");
    const [age, setAge] = useState("");
    const [publicId, setPublicId] = useState("");
    const [loading, setLoading] = useState(false);

    // We should ideally pass current user data via params or context, but for simplicity let's fetch or just expect user to re-enter
    // Better UX: Pre-fill. For now, empty fields imply update if entered.

    const handleSave = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("token");
            const body: any = {};
            if (name) body.name = name;
            if (age) body.age = parseInt(age);
            if (publicId) body.publicId = publicId;

            if (Object.keys(body).length === 0) {
                setLoading(false);
                return;
            }

            const res = await fetch(`${API_BASE_URL}/profile/update`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            const json = await res.json();

            if (json.success) {
                Alert.alert("Success", "Profile updated");
                router.back();
            } else {
                Alert.alert("Error", json.message || "Failed to update");
            }
        } catch (error) {
            Alert.alert("Error", "Network error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading}>
                    {loading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.saveText}>Save</Text>}
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Type your name"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Age</Text>
                    <TextInput
                        style={styles.input}
                        value={age}
                        onChangeText={setAge}
                        placeholder="Your age"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Public ID</Text>
                    <TextInput
                        style={styles.input}
                        value={publicId}
                        onChangeText={setPublicId}
                        placeholder="Unique ID (e.g. USER_123)"
                        autoCapitalize="characters"
                        placeholderTextColor={colors.textSecondary}
                    />
                    <Text style={styles.helperText}>Used for friend requests. Must be unique.</Text>
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
    saveText: {
        fontSize: FontSize.md,
        color: colors.primary,
        fontWeight: "600",
    },
    content: {
        padding: Spacing.lg,
    },
    inputGroup: {
        marginBottom: Spacing.xl,
    },
    label: {
        fontSize: FontSize.sm,
        fontWeight: "600",
        color: colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    input: {
        backgroundColor: colors.surface,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        color: colors.textPrimary,
        fontSize: FontSize.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    helperText: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
    },
});

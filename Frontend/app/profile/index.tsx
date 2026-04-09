import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Image, Alert } from "react-native";
import { useEffect, useState, useMemo, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "@/constants/api";
import { Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    const fetchProfile = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) return;

            const res = await fetch(`${API_BASE_URL}/profile/me`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const json = await res.json();

            if (json.success) {
                setUser(json.data);
            }
        } catch (error) {
            console.error("Fetch profile error", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchProfile();
        }, [fetchProfile])
    );

    const handleAvatarUpload = async () => {
        // Request permission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            uploadImage(result.assets[0].uri);
        }
    };

    const uploadImage = async (uri: string) => {
        const formData = new FormData();
        // @ts-ignore
        formData.append('avatar', {
            uri,
            name: 'avatar.jpg',
            type: 'image/jpeg',
        });

        try {
            const token = await AsyncStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/profile/avatar`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
                body: formData,
            });
            const json = await res.json();
            if (json.success) {
                setUser({ ...user, avatar: json.data.avatar });
                Alert.alert("Success", "Avatar updated!");
            } else {
                Alert.alert("Error", json.message || "Upload failed");
            }
        } catch (error) {
            Alert.alert("Error", "Upload failed");
        }
    };

    const handleLogout = async () => {
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("userId");
        router.replace("/auth");
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!user) {
        return (
            <SafeAreaView style={[styles.container, styles.center]}>
                <Text style={{ color: colors.textPrimary }}>Failed to load profile.</Text>
                <TouchableOpacity onPress={fetchProfile} style={{ marginTop: 20, padding: 10, backgroundColor: colors.primary, borderRadius: 8 }}>
                    <Text style={{ color: 'white' }}>Retry</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Identity Card */}
                <View style={styles.card}>
                    <View style={styles.profileHeader}>
                        <TouchableOpacity onPress={handleAvatarUpload} style={styles.avatarContainer}>
                            {user.avatar ? (
                                <Image source={{ uri: user.avatar }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                    <Text style={styles.avatarText}>{user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}</Text>
                                </View>
                            )}
                            <View style={styles.editBadge}>
                                <Ionicons name="camera" size={12} color="#fff" />
                            </View>
                        </TouchableOpacity>

                        <View style={styles.profileInfo}>
                            <Text style={styles.name}>{user.name || "No Name"}</Text>
                            <Text style={styles.email}>{user.email}</Text>
                            <View style={styles.idBadge}>
                                <Text style={styles.idText}>ID: {user.publicId || "N/A"}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{user.friends?.length || 0}</Text>
                            <Text style={styles.statLabel}>Friends</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{user.checkIns?.length || 0}</Text>
                            <Text style={styles.statLabel}>Check-ins</Text>
                        </View>
                    </View>
                </View>

                {/* Menu */}
                <View style={styles.section}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/profile/edit")}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.iconBox, { backgroundColor: colors.primary + '20' }]}>
                                <Ionicons name="person-outline" size={20} color={colors.primary} />
                            </View>
                            <Text style={styles.menuText}>Edit Profile</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/profile/preferences")}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.iconBox, { backgroundColor: colors.textPrimary + '20' }]}>
                                <Ionicons name="settings-outline" size={20} color={colors.textPrimary} />
                            </View>
                            <Text style={styles.menuText}>App Preferences</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/profile/privacy")}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.iconBox, { backgroundColor: colors.secondary + '20' }]}>
                                <Ionicons name="lock-closed-outline" size={20} color={colors.secondary} />
                            </View>
                            <Text style={styles.menuText}>Privacy</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/profile/security")}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.iconBox, { backgroundColor: colors.warning + '20' }]}>
                                <Ionicons name="shield-checkmark-outline" size={20} color={colors.warning} />
                            </View>
                            <Text style={styles.menuText}>Security</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Version 1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background || '#121212',
    },
    center: {
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background, // Ensure header is opaque
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
    card: {
        backgroundColor: colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
        ...Shadows.medium,
    },
    profileHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: Spacing.lg,
    },
    avatarContainer: {
        position: "relative",
        marginRight: Spacing.lg,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    avatarPlaceholder: {
        backgroundColor: colors.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: {
        fontSize: 32,
        fontWeight: "700",
        color: "#fff",
    },
    editBadge: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: colors.textPrimary,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: colors.surface,
    },
    profileInfo: {
        flex: 1,
    },
    name: {
        fontSize: FontSize.xl,
        fontWeight: "700",
        color: colors.textPrimary,
        marginBottom: 4,
    },
    email: {
        fontSize: FontSize.sm,
        color: colors.textSecondary,
        marginBottom: 8,
    },
    idBadge: {
        backgroundColor: colors.background,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
        alignSelf: "flex-start",
    },
    idText: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.textPrimary,
    },
    statsRow: {
        flexDirection: "row",
        justifyContent: "space-around",
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    statItem: {
        alignItems: "center",
    },
    statValue: {
        fontSize: FontSize.lg,
        fontWeight: "700",
        color: colors.textPrimary,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: "100%",
        backgroundColor: colors.border,
    },
    section: {
        backgroundColor: colors.surface,
        borderRadius: BorderRadius.xl,
        marginBottom: Spacing.xl,
        overflow: "hidden",
        ...Shadows.small,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    menuLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        marginRight: Spacing.md,
    },
    menuText: {
        fontSize: FontSize.md,
        fontWeight: "500",
        color: colors.textPrimary,
    },
    logoutButton: {
        padding: Spacing.lg,
        alignItems: "center",
        justifyContent: "center",
    },
    logoutText: {
        fontSize: FontSize.md,
        color: colors.error,
        fontWeight: "600",
    },
    versionText: {
        textAlign: "center",
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: Spacing.sm,
    },
});

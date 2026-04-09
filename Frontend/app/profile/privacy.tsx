import { StyleSheet, Text, View, Switch, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "@/constants/api";

export default function PrivacyScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [loading, setLoading] = useState(true);
    const [privacy, setPrivacy] = useState<any>({});

    useEffect(() => {
        loadPrivacy();
    }, []);

    const loadPrivacy = async () => {
        try {
            const token = await AsyncStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/profile/me`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setPrivacy(json.data.privacy || {});
            }
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const updatePrivacy = async (key: string, value: any) => {
        const newPrivacy = { ...privacy, [key]: value };
        setPrivacy(newPrivacy); // Optimistic update

        try {
            const token = await AsyncStorage.getItem("token");
            await fetch(`${API_BASE_URL}/profile/privacy`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ [key]: value })
            });
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to update setting");
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator color={colors.primary} />
            </View>
        )
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Privacy</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionTitle}>VISIBILITY</Text>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <Text style={styles.label}>Profile Visibility</Text>
                        {/* Simple toggle for now, ideally a picker */}
                        <Switch
                            value={privacy.profileVisibility === 'public'}
                            onValueChange={(v) => updatePrivacy('profileVisibility', v ? 'public' : 'friends')}
                            trackColor={{ false: colors.border, true: colors.primary }}
                        />
                    </View>
                    <Text style={styles.helperText}>
                        {privacy.profileVisibility === 'public' ? 'Everyone can see your profile details.' : 'Only friends can see your profile.'}
                    </Text>

                    <View style={styles.divider} />

                    <View style={styles.row}>
                        <Text style={styles.label}>Check-in Visibility</Text>
                        <Switch
                            value={privacy.checkinVisibility === 'public'}
                            onValueChange={(v) => updatePrivacy('checkinVisibility', v ? 'public' : 'friends')}
                            trackColor={{ false: colors.border, true: colors.primary }}
                        />
                    </View>
                    <Text style={styles.helperText}>
                        {privacy.checkinVisibility === 'public' ? 'Everyone can see your check-ins.' : 'Only friends can see your check-ins.'}
                    </Text>
                </View>

                <Text style={styles.sectionTitle}>DISCOVERY</Text>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <Text style={styles.label}>Allow Friend Requests</Text>
                        <Switch
                            value={privacy.friendRequestPermission !== 'nobody'}
                            onValueChange={(v) => updatePrivacy('friendRequestPermission', v ? 'everyone' : 'nobody')}
                            trackColor={{ false: colors.border, true: colors.primary }}
                        />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.row}>
                        <Text style={styles.label}>Searchable by ID</Text>
                        <Switch
                            value={privacy.searchable}
                            onValueChange={(v) => updatePrivacy('searchable', v)}
                            trackColor={{ false: colors.border, true: colors.primary }}
                        />
                    </View>
                </View>

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
        justifyContent: 'center',
        alignItems: 'center'
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
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: Spacing.sm,
        marginLeft: Spacing.sm,
        letterSpacing: 1
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.xl,
        ...Shadows.small
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.sm
    },
    label: {
        fontSize: FontSize.md,
        color: colors.textPrimary,
        fontWeight: '500'
    },
    helperText: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: -4,
        marginBottom: 8
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: Spacing.sm
    }

});

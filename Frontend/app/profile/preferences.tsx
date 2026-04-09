import { StyleSheet, Text, View, Switch, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "@/constants/api";
import { Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";

type Settings = {
    reminderEnabled: boolean;
    reminderTime?: string;
    notifications?: {
        checkIns: boolean;
        friendRequests: boolean;
        updates: boolean;
    };
    theme: "light" | "dark" | "system";
};

export default function PreferencesScreen() {
    const router = useRouter();
    const { theme, setTheme, colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [reminderDate, setReminderDate] = useState(new Date());

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const token = await AsyncStorage.getItem("token");
                if (!token) return;

                const res = await fetch(`${API_BASE_URL}/profile/me`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const json = await res.json();

                if (json.success) {
                    const userSettings = json.data.settings || {
                        theme: 'system',
                        reminderEnabled: true,
                        reminderTime: "20:00",
                        notifications: { checkIns: true, friendRequests: true, updates: false }
                    };
                    setSettings(userSettings);
                    if (userSettings.reminderTime) {
                        const [hours, minutes] = userSettings.reminderTime.split(':');
                        const d = new Date();
                        d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
                        setReminderDate(d);
                    }

                    if (userSettings.theme && userSettings.theme !== theme) {
                        setTheme(userSettings.theme);
                    }
                }
            } catch (error) {
                console.log("Settings fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, []);

    const updateServer = async (endpoint: string, body: any) => {
        try {
            const token = await AsyncStorage.getItem("token");
            // Use new profile/settings/* endpoints
            await fetch(`${API_BASE_URL}/profile/settings/${endpoint}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
        } catch (error) {
            console.error("Failed to update settings", error);
        }
    };

    const toggleTheme = (isDarkTheme: boolean) => {
        const newTheme = isDarkTheme ? 'dark' : 'light';
        setTheme(newTheme);
        updateServer('theme', { theme: newTheme });
    };

    const toggleReminder = (enabled: boolean) => {
        if (!settings) return;
        const newSettings = { ...settings, reminderEnabled: enabled };
        setSettings(newSettings);
        updateServer('reminder', { enabled, time: settings.reminderTime });
    };

    const handleTimeChange = (event: any, selectedDate?: Date) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (selectedDate && settings) {
            setReminderDate(selectedDate);
            const hours = selectedDate.getHours().toString().padStart(2, '0');
            const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
            const newReminderTime = `${hours}:${minutes}`;

            setSettings({ ...settings, reminderTime: newReminderTime });
            updateServer('reminder', { enabled: settings.reminderEnabled, time: newReminderTime });
        }
    };

    const toggleNotification = (key: keyof NonNullable<Settings['notifications']>) => {
        if (!settings || !settings.notifications) return;
        const newNotifs = { ...settings.notifications, [key]: !settings.notifications[key] };
        setSettings({ ...settings, notifications: newNotifs });
        updateServer('notifications', { [key]: newNotifs[key] });
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!settings) return null;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Preferences</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>APPEARANCE</Text>
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <Ionicons name="moon-outline" size={22} color={colors.textPrimary} style={styles.icon} />
                                <Text style={styles.label}>Dark Mode</Text>
                            </View>
                            <Switch
                                value={isDark}
                                onValueChange={toggleTheme}
                                trackColor={{ false: colors.border, true: colors.primary }}
                            />
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} style={styles.icon} />
                                <Text style={styles.label}>Daily Reminder</Text>
                            </View>
                            <Switch
                                value={settings.reminderEnabled}
                                onValueChange={toggleReminder}
                                trackColor={{ false: colors.border, true: colors.primary }}
                            />
                        </View>

                        {settings.reminderEnabled && (
                            <>
                                <View style={styles.divider} />
                                <View style={styles.row}>
                                    <View style={styles.rowLeft}>
                                        <Ionicons name="time-outline" size={22} color={colors.textSecondary} style={[styles.icon, { marginLeft: 6 }]} />
                                        <Text style={[styles.label, { color: colors.textSecondary }]}>Time</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.timePickerBtn}
                                        onPress={() => setShowTimePicker(true)}
                                    >
                                        <Text style={styles.timePickerText}>
                                            {reminderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        {showTimePicker && (
                            <DateTimePicker
                                value={reminderDate}
                                mode="time"
                                is24Hour={true}
                                display="default"
                                onChange={handleTimeChange}
                            />
                        )}

                        <View style={styles.divider} />

                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <Ionicons name="people-outline" size={22} color={colors.textPrimary} style={styles.icon} />
                                <Text style={styles.label}>Friend Check-ins</Text>
                            </View>
                            <Switch
                                value={settings.notifications?.checkIns ?? true}
                                onValueChange={() => toggleNotification('checkIns')}
                                trackColor={{ false: colors.border, true: colors.primary }}
                            />
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <Ionicons name="person-add-outline" size={22} color={colors.textPrimary} style={styles.icon} />
                                <Text style={styles.label}>Friend Requests</Text>
                            </View>
                            <Switch
                                value={settings.notifications?.friendRequests ?? true}
                                onValueChange={() => toggleNotification('friendRequests')}
                                trackColor={{ false: colors.border, true: colors.primary }}
                            />
                        </View>
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
    section: {
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontSize: FontSize.xs,
        color: colors.textSecondary,
        marginBottom: Spacing.sm,
        marginLeft: Spacing.sm,
        fontWeight: "600",
        letterSpacing: 1,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: BorderRadius.lg,
        overflow: "hidden",
        ...Shadows.small,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: Spacing.md,
    },
    rowLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    icon: {
        marginRight: Spacing.md,
    },
    label: {
        fontSize: FontSize.md,
        color: colors.textPrimary,
        fontWeight: "500",
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginLeft: 50,
    },
    timePickerBtn: {
        backgroundColor: colors.background,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    timePickerText: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: FontSize.md,
    }
});

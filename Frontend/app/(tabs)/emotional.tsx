import { StyleSheet, Text, View, FlatList, ActivityIndicator, TextInput, TouchableOpacity, useWindowDimensions, Alert } from "react-native";
import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "@/constants/api";
import { useUserId } from "@/hooks/useUserId";
import { useTheme } from "@/context/ThemeContext";
import { FontSize, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from '@react-navigation/native';

type UserPresence = {
    userId: string;
    name: string;
    lastCheckIn: {
        date: string;
        mood: string;
        timestamp: string;
    };
};

type FriendThought = {
    name: string;
    thought: string;
    timestamp?: string;
};

export default function EmotionalPresenceScreen() {
    const userId = useUserId();
    const { colors } = useTheme();
    const { height } = useWindowDimensions();
    const thoughtBoxHeight = height * 0.22;

    const [friendsThoughts, setFriendsThoughts] = useState<FriendThought[]>([]);
    const [myThought, setMyThought] = useState<{ thought: string, timestamp?: string } | null>(null);
    const [thoughtInput, setThoughtInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [savingThought, setSavingThought] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const fetchPresence = useCallback(async (showLoader = true) => {
        try {
            const token = await AsyncStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/emotional-presence`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const json = await res.json();
            if (json.success) {
                setFriendsThoughts(json.friendsThoughts || []);
                setMyThought(json.myThought || null);
            }
        } catch (error) {
            console.error("Failed to fetch emotional presence", error);
        } finally {
            if (showLoader) setLoading(false);
        }
    }, []);

    const saveThought = useCallback(async () => {
        const trimmed = thoughtInput.trim();
        setSaveMessage(null);

        if (!trimmed) {
            setSaveMessage({ type: "error", text: "Please enter a message first" });
            return;
        }

        const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
        if (wordCount > 60) {
            setSaveMessage({ type: "error", text: "Maximum 60 words allowed" });
            return;
        }

        setSavingThought(true);
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) {
                setSaveMessage({ type: "error", text: "Please log in again" });
                setSavingThought(false);
                return;
            }

            const res = await fetch(`${API_BASE_URL}/emotional-presence/thought`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ thought: trimmed }),
            });

            let json;
            try {
                json = await res.json();
            } catch {
                setSaveMessage({ type: "error", text: "Invalid response from server" });
                setSavingThought(false);
                return;
            }

            if (json.success) {
                setSaveMessage({ type: "success", text: "Saved! Your friends can see this." });
                setThoughtInput("");
                await fetchPresence(true);
                setTimeout(() => setSaveMessage(null), 3000);
            } else {
                console.warn("Save failed:", json);
                setSaveMessage({ type: "error", text: json.message || "Failed to save" });
            }
        } catch (error) {
            console.error("Failed to save thought", error);
            setSaveMessage({ type: "error", text: "Network error. Check your connection." });
        } finally {
            setSavingThought(false);
        }
    }, [thoughtInput, fetchPresence]);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchPresence(true);
            const interval = setInterval(() => {
                fetchPresence(false);
            }, 3000); // 3 second polling
            return () => clearInterval(interval);
        }, [fetchPresence])
    );

    const getTimeAgo = (timestamp: string) => {
        const diff = Date.now() - new Date(timestamp).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    };

    if (loading && friendsThoughts.length === 0 && !myThought) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const wordCount = thoughtInput.trim() ? thoughtInput.trim().split(/\s+/).filter(Boolean).length : 0;
    const isOverLimit = wordCount > 60;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>Emotional Presence</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>See how your circle is feeling today.</Text>
            </View>

            <FlatList
                data={friendsThoughts}
                keyExtractor={(item, index) => index.toString()}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={
                    <View style={styles.thoughtSection}>
                        <Text style={[styles.thoughtLabel, { color: colors.textPrimary }]}>What do you think today?</Text>
                        <TextInput
                            style={[
                                styles.thoughtInput,
                                {
                                    height: thoughtBoxHeight,
                                    backgroundColor: colors.surface,
                                    color: colors.textPrimary,
                                    borderColor: isOverLimit ? colors.error : colors.border,
                                },
                            ]}
                            placeholder="Share your thoughts..."
                            placeholderTextColor={colors.textSecondary}
                            value={thoughtInput}
                            onChangeText={setThoughtInput}
                            multiline
                            maxLength={400}
                        />
                        {saveMessage && (
                            <View style={[styles.saveMessage, { backgroundColor: saveMessage.type === "success" ? colors.success + "20" : colors.error + "20" }]}>
                                <Text style={[styles.saveMessageText, { color: saveMessage.type === "success" ? colors.success : colors.error }]}>
                                    {saveMessage.text}
                                </Text>
                            </View>
                        )}
                        <View style={styles.thoughtFooter}>
                            <Text style={[styles.wordCount, { color: isOverLimit ? colors.error : colors.textSecondary }]}>
                                {wordCount}/60 words
                            </Text>
                            <View style={styles.thoughtActions}>

                                <TouchableOpacity
                                    style={[styles.saveThoughtBtn, { backgroundColor: colors.primary }]}
                                    onPress={saveThought}
                                    disabled={savingThought || isOverLimit}
                                >
                                    {savingThought ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.saveThoughtText}>Save</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="heart-outline" size={64} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No updates yet.</Text>
                        <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>Be the first to check in!</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <View style={styles.messageRow}>
                        <Text style={[styles.messageName, { color: colors.textPrimary }]}>{item.name}: </Text>
                        <Text style={[styles.messageText, { color: colors.textPrimary }]}>{item.thought}</Text>
                        {item.timestamp && (
                            <Text style={[styles.messageTime, { color: colors.textSecondary }]}>  • {getTimeAgo(item.timestamp)}</Text>
                        )}
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.xs,
    },
    thoughtSection: {
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.md,
        paddingTop: 0,
    },
    thoughtLabel: {
        fontSize: FontSize.md,
        fontWeight: "600",
        marginBottom: Spacing.sm,
    },
    thoughtInput: {
        borderWidth: 1,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        fontSize: FontSize.md,
        textAlignVertical: "top",
    },
    saveMessage: {
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        marginTop: Spacing.sm,
    },
    saveMessageText: {
        fontSize: FontSize.sm,
        fontWeight: "500",
    },
    thoughtFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: Spacing.sm,
    },
    thoughtActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
    },
    clearThoughtBtn: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
    },
    clearThoughtText: {
        fontWeight: "600",
        fontSize: FontSize.sm,
    },
    wordCount: {
        fontSize: FontSize.xs,
    },
    saveThoughtBtn: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.lg,
    },
    saveThoughtText: {
        color: "#fff",
        fontWeight: "600",
    },
    friendsThoughts: {
        marginTop: Spacing.lg,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: "rgba(128,128,128,0.2)",
    },
    friendsThoughtsTitle: {
        fontSize: FontSize.sm,
        fontWeight: "600",
        marginBottom: Spacing.sm,
    },
    friendThought: {
        fontSize: FontSize.sm,
        marginBottom: Spacing.sm,
    },
    title: {
        fontSize: FontSize.xxl,
        fontWeight: "800",
    },
    subtitle: {
        fontSize: FontSize.md,
        marginTop: Spacing.xs,
    },
    listContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl,
    },
    messageRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        paddingVertical: 6,
        paddingHorizontal: Spacing.sm,
    },
    messageName: {
        fontSize: FontSize.md,
        fontWeight: '700',
    },
    messageText: {
        fontSize: FontSize.md,
        flexShrink: 1,
    },
    messageTime: {
        fontSize: FontSize.xs,
        marginLeft: 4,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingTop: Spacing.xxl,
    },
    emptyText: {
        fontSize: FontSize.lg,
        marginTop: Spacing.md,
        fontWeight: "500",
    },
    emptySubText: {
        fontSize: FontSize.sm,
        marginTop: Spacing.xs,
    },
});

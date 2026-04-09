import { StyleSheet, Text, View, FlatList, ActivityIndicator } from "react-native";
import { useState, useMemo, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "@/constants/api";
import { useUserId } from "@/hooks/useUserId";
import { Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";

type CheckIn = {
  date: string;
  mood: string;
  timestamp: string;
  _id?: string;
};

export default function HistoryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const userId = useUserId();
  const [history, setHistory] = useState<(string | CheckIn)[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;

      const loadHistory = async () => {
        try {
          const token = await AsyncStorage.getItem("token");
          const res = await fetch(
            `${API_BASE_URL}/history?userId=${userId}`,
            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
          );
          const json = await res.json();

          if (json.success) {
            setHistory([...json.data].reverse());
          }
        } catch (error) {
          console.log("History fetch error:", error);
        } finally {
          setLoading(false);
        }
      };

      loadHistory();
    }, [userId])
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderItem = ({ item, index }: { item: string | CheckIn, index: number }) => {
    const isObject = typeof item === 'object';
    const date = isObject ? item.date : item;
    const mood = isObject ? item.mood : null;

    return (
      <View style={styles.timelineItem}>
        <View style={styles.timelineLeft}>
          <View style={styles.timelineDot} />
          {index !== history.length - 1 && <View style={styles.timelineLine} />}
        </View>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} style={{ marginRight: Spacing.sm }} />
            <Text style={styles.cardTitle}>Checked In</Text>
            {mood && (
              <View style={[styles.moodBadge, { backgroundColor: colors.background }]}>
                <Text style={{ fontSize: 12 }}>{mood === 'great' ? '😊' : mood === 'okay' ? '😐' : '😞'}</Text>
              </View>
            )}
          </View>
          <Text style={styles.date}>{new Date(date).toDateString()}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Your History</Text>
        <Text style={styles.subtitle}>A record of your consistency.</Text>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item, index) => typeof item === 'object' ? (item._id || index.toString()) : item}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={colors.textSecondary} style={{ opacity: 0.5 }} />
            <Text style={styles.emptyText}>No check-ins yet.</Text>
            <Text style={styles.emptySubText}>Check-in today to start your streak!</Text>
          </View>
        }
        renderItem={renderItem}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: colors.textSecondary,
    marginTop: Spacing.xs,
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  timelineLeft: {
    alignItems: "center",
    marginRight: Spacing.md,
    width: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.small,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  moodBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  date: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    marginLeft: 28, // Align with title text
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSize.lg,
    color: colors.textSecondary,
    marginTop: Spacing.md,
    fontWeight: "500",
  },
  emptySubText: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    marginTop: Spacing.xs,
  },
});

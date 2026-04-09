import { FontSize, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUserId } from "@/hooks/useUserId";
import { useUser } from "@/hooks/useUser";
import { useState, useCallback, useMemo } from "react";
import { API_BASE_URL } from "@/constants/api";
import { useTheme } from "@/context/ThemeContext";
import { useFocusEffect } from '@react-navigation/native';

type Mood = "great" | "okay" | "bad";

export default function HomeScreen() {
  const userId = useUserId();
  const user = useUser();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [totalCheckIns, setTotalCheckIns] = useState(0);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/history?userId=${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();

      if (json.success) {
        const history: any[] = json.data;
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

        const dates = history.map(item => typeof item === 'string' ? item : item.date);

        setHasCheckedIn(dates.includes(today));
        setTotalCheckIns(dates.length);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleCheckIn = async () => {
    if (!userId) {
      Alert.alert("Error", "User ID not found. Please try logging in again.");
      return;
    }
    if (!selectedMood) {
      Alert.alert("Mood Needed", "How are you feeling today?");
      return;
    }

    setCheckingIn(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please log in again.");
        return;
      }

      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const res = await fetch(`${API_BASE_URL}/checkin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ userId, date: today, mood: selectedMood }),
      });
      const json = await res.json();

      if (json.success) {
        setHasCheckedIn(true);
        await fetchData();
      } else {
        Alert.alert("Error", "Could not check in.");
      }
    } catch (error) {
      Alert.alert("Error", "Network error.");
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading && !totalCheckIns) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {user?.name || "there"}!</Text>
          <Text style={styles.title}>Ready to Check-in?</Text>
        </View>

        {hasCheckedIn ? (
          <View style={styles.statusCard}>
            <Ionicons name="checkmark-done-circle" size={64} color={colors.success} />
            <Text style={styles.statusTitle}>You're Checked In!</Text>
            <Text style={styles.statusSubtitle}>Great job staying consistent.</Text>
            <Text style={styles.date}>{new Date().toLocaleDateString()}</Text>
          </View>
        ) : (
          <View style={styles.moodContainer}>
            <Text style={styles.moodTitle}>How are you feeling?</Text>
            <View style={styles.moodOptions}>
              <TouchableOpacity
                style={[styles.moodOption, selectedMood === 'great' && styles.moodOptionSelected]}
                onPress={() => setSelectedMood('great')}
              >
                <Text style={styles.moodEmoji}>😊</Text>
                <Text style={styles.moodText}>Great</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.moodOption, selectedMood === 'okay' && styles.moodOptionSelected]}
                onPress={() => setSelectedMood('okay')}
              >
                <Text style={styles.moodEmoji}>😐</Text>
                <Text style={styles.moodText}>Okay</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.moodOption, selectedMood === 'bad' && styles.moodOptionSelected]}
                onPress={() => setSelectedMood('bad')}
              >
                <Text style={styles.moodEmoji}>😞</Text>
                <Text style={styles.moodText}>Not Great</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.checkInButton, { backgroundColor: selectedMood ? colors.primary : colors.border }]}
              onPress={handleCheckIn}
              disabled={!selectedMood || checkingIn}
            >
              {checkingIn ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.checkInText}>Check In</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{totalCheckIns}</Text>
            <Text style={styles.statLabel}>Total Check-ins</Text>
          </View>
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  header: {
    marginBottom: Spacing.lg,
    marginTop: 0,
  },
  greeting: {
    fontSize: FontSize.lg,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  statusCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.xl,
    backgroundColor: colors.surface,
    ...Shadows.medium,
  },
  moodContainer: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    backgroundColor: colors.surface,
    ...Shadows.medium,
  },
  moodTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    marginBottom: Spacing.md,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  moodOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  moodOption: {
    alignItems: 'center',
    padding: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: BorderRadius.lg,
    width: '30%',
  },
  moodOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  moodEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  moodText: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  checkInButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  checkInText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: FontSize.md,
  },
  statusTitle: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    marginTop: Spacing.md,
    color: colors.textPrimary,
  },
  statusSubtitle: {
    fontSize: FontSize.md,
    marginTop: Spacing.xs,
    color: colors.textSecondary,
  },
  date: {
    marginTop: Spacing.lg,
    fontSize: FontSize.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
    overflow: "hidden",
    color: colors.textSecondary,
    backgroundColor: colors.background,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.xl,
  },
  statBox: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    marginHorizontal: Spacing.xs,
    backgroundColor: colors.surface,
    ...Shadows.small,
  },
  statNumber: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: colors.primary,
  },
  statLabel: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.textSecondary,
  },
});

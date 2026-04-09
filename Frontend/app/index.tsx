import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View, StyleSheet, Image } from "react-native";
import { Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useMemo } from "react";

export default function LandingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={80} color={colors.primary} />
        </View>

        <Text style={styles.title}>Welcome into Checkin’in</Text>
        <Text style={styles.subtitle}>
          Stay connected with your circle by simply checking in every day.
        </Text>

        <View style={styles.features}>
          <FeatureItem icon="time" text="Daily Check-ins" colors={colors} styles={styles} />
          <FeatureItem icon="people" text="Stay Connected" colors={colors} styles={styles} />
          <FeatureItem icon="shield-checkmark" text="Safe & Secure" colors={colors} styles={styles} />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/auth")}
        >
          <Text style={styles.buttonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, text, colors, styles }: { icon: any; text: string; colors: any; styles: any }) {
  return (
    <View style={styles.featureItem}>
      <Ionicons name={icon} size={24} color={colors.primary} style={styles.featureIcon} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  iconContainer: {
    marginBottom: Spacing.xl,
    ...Shadows.medium,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: FontSize.lg,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.xxl,
    lineHeight: 28,
  },
  features: {
    width: "100%",
    marginBottom: Spacing.xxl + Spacing.lg,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    backgroundColor: colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Shadows.small,
  },
  featureIcon: {
    marginRight: Spacing.md,
  },
  featureText: {
    fontSize: FontSize.md,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  button: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.round,
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
    ...Shadows.medium,
  },
  buttonText: {
    color: "#fff",
    fontSize: FontSize.lg,
    fontWeight: "bold",
  },
});

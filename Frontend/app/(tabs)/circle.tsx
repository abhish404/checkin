import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Clipboard,
  Image,
} from "react-native";
import { useEffect, useState, useCallback, useMemo } from "react";
import { API_BASE_URL } from "@/constants/api";
import { Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/context/ThemeContext";

type Friend = {
  userId: string;
  publicId: string;
  name?: string;
  email: string;
  avatar?: string;
  bio?: string;
  streak?: number;
  lastCheckIn?: {
    date: string;
    mood: string;
    timestamp: string;
  };
};

type Request = {
  userId: string;
  publicId: string;
  name?: string;
  email?: string;
};

export default function CircleScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const [myPublicId, setMyPublicId] = useState<string>("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [sentRequests, setSentRequests] = useState<Request[]>([]);
  const [inputPublicId, setInputPublicId] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const fetchFriendsData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/friends`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setFriends(json.data.friends);
        setRequests(json.data.requests.received);
        setSentRequests(json.data.requests.sent);
        setMyPublicId(json.data.myPublicId);
      }
    } catch (error) {
      console.error("Failed to load friend data", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchFriendsData();
    }, [fetchFriendsData])
  );

  const handleSendRequest = async () => {
    if (!inputPublicId.trim()) return;
    setSearching(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/friends/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          targetPublicId: inputPublicId.trim().toUpperCase().replace(" ", "_"),
        }),
      });
      const json = await res.json();

      if (json.success) {
        Alert.alert("Success", "Friend request sent!");
        setInputPublicId("");
        fetchFriendsData();
      } else {
        Alert.alert("Error", json.message || "Failed to send request");
      }
    } catch (error) {
      Alert.alert("Error", "Network error");
    } finally {
      setSearching(false);
    }
  };

  const handleRespond = async (requesterId: string, action: 'accept' | 'reject') => {
    setRequests((prev) => prev.filter((r) => r.userId !== requesterId));
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/friends/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ requesterId, action }),
      });
      const json = await res.json();
      if (json.success) {
        fetchFriendsData();
      } else {
        Alert.alert("Error", json.message || "Failed to respond");
        fetchFriendsData();
      }
    } catch (error) {
      Alert.alert("Error", "Network error");
      fetchFriendsData();
    }
  };

  const openFriendProfile = (friend: Friend) => {
    router.push(`/profile/${friend.publicId}` as any);
  };

  const copyToClipboard = () => {
    Clipboard.setString(myPublicId);
    Alert.alert("Copied", "Your ID has been copied to clipboard.");
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <TouchableOpacity onPress={() => openFriendProfile(item)} style={styles.card}>
      <View style={styles.userInfo}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{item.email ? item.email[0].toUpperCase() : "?"}</Text>
          </View>
        )}
        <View style={styles.textColumn}>
          <Text style={styles.userName}>{item.name || item.email?.split('@')[0] || "Friend"}</Text>
          <Text style={styles.userEmail}>
            {item.publicId}
            {item.streak && item.streak > 0 ? `  🔥 ${item.streak}` : ""}
          </Text>
          {item.bio ? (
            <Text style={styles.bioText} numberOfLines={1}>{item.bio}</Text>
          ) : null}
        </View>
      </View>
      {item.lastCheckIn ? (
        <View style={styles.moodContainer}>
          <Text style={styles.moodEmoji}>{item.lastCheckIn.mood === 'great' ? '😄' : item.lastCheckIn.mood === 'okay' ? '😐' : '😞'}</Text>
          <Text style={styles.moodDate}>{new Date(item.lastCheckIn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
      ) : (
        <Text style={styles.moodDate}>No recent check-in visible</Text>
      )}
    </TouchableOpacity>
  );

  const renderRequest = ({ item }: { item: Request }) => {
    const displayName = item.name || item.email?.split('@')[0] || "User";
    const initial = (displayName || "?")[0].toUpperCase();
    return (
      <View style={styles.card}>
        <View style={styles.userInfo}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userEmail}>ID: {item.publicId}</Text>
          </View>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={() => handleRespond(item.userId, 'accept')}>
            <Text style={styles.actionBtnText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleRespond(item.userId, 'reject')}>
            <Text style={styles.actionBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Circle</Text>
        <View style={styles.idContainer}>
          <Text style={styles.idLabel}>My ID:</Text>
          <TouchableOpacity style={styles.idBox} onPress={copyToClipboard}>
            <Text style={styles.idText}>{myPublicId || "Loading..."}</Text>
            <Ionicons name="copy-outline" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>My Friends</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests {requests.length > 0 && `(${requests.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'friends' ? (
          <>
            <View style={styles.searchSection}>
              <Text style={styles.sectionTitle}>Add a Friend</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter Public ID (e.g. CIN_XXXXXX)"
                  value={inputPublicId}
                  onChangeText={setInputPublicId}
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="characters"
                />
                <TouchableOpacity style={styles.addButton} onPress={handleSendRequest} disabled={searching}>
                  {searching ? <ActivityIndicator color="#fff" /> : <Ionicons name="person-add" size={20} color="#fff" />}
                </TouchableOpacity>
              </View>
            </View>

            {loading ? (
              <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />
            ) : (
              <FlatList
                data={friends}
                keyExtractor={(item) => item.userId}
                renderItem={renderFriend}
                ListEmptyComponent={<Text style={styles.emptyText}>No friends yet. Add someone!</Text>}
                contentContainerStyle={styles.listContent}
              />
            )}
          </>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.userId}
            renderItem={renderRequest}
            ListEmptyComponent={<Text style={styles.emptyText}>No pending requests.</Text>}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
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
    backgroundColor: colors.surface,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    ...Shadows.small,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  idLabel: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    marginRight: Spacing.sm,
  },
  idBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    borderColor: colors.border,
    borderWidth: 1,
  },
  idText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: Spacing.xs,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  tab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginRight: Spacing.sm,
    borderRadius: BorderRadius.round,
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: colors.primary + '20', // 20% opacity
  },
  tabText: {
    fontSize: FontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.primary,
  },
  content: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: Spacing.sm,
  },
  addButton: {
    backgroundColor: colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  card: {
    backgroundColor: colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: "#fff",
  },
  userName: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  userEmail: {
    fontSize: FontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bioText: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    marginTop: 4,
  },
  textColumn: {
    flex: 1,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.md,
  },
  moodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  moodEmoji: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  moodDate: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    justifyContent: 'flex-end',
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    marginLeft: Spacing.sm,
  },
  acceptBtn: {
    backgroundColor: colors.success,
  },
  rejectBtn: {
    backgroundColor: colors.error,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: FontSize.sm,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: FontSize.md,
    marginTop: Spacing.xl,
  },
});

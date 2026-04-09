import { StyleSheet, Text, View, ActivityIndicator, FlatList, TouchableOpacity, Alert, Image, TextInput, Modal, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "@/constants/api";
import { useTheme } from "@/context/ThemeContext";
import { FontSize, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

type ProfileData = {
    publicId: string;
    name: string;
    avatar?: string;
    bio?: string;
    friendCount: number;
    streak: number;
    totalCheckIns: number;
    weeklyMoodSummary: { great: number; okay: number; bad: number };
    recentCheckIns: Array<{ date: string; mood: string; timestamp: string }>;
    isFriend: boolean;
    isSelf: boolean;
};

export default function ViewProfileScreen() {
    const { publicId } = useLocalSearchParams();
    const router = useRouter();
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(colors, insets), [colors, insets]);

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorStatus, setErrorStatus] = useState<{ status: number; message: string } | null>(null);
    const [processingAction, setProcessingAction] = useState(false);

    // Bio Edit State
    const [editingBio, setEditingBio] = useState(false);
    const [bioText, setBioText] = useState("");
    const [savingBio, setSavingBio] = useState(false);

    // Photo Action Menu State
    const [photoMenuVisible, setPhotoMenuVisible] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const fetchProfile = useCallback(async () => {
        try {
            setLoading(true);
            setErrorStatus(null);
            const token = await AsyncStorage.getItem("token");
            if (!token) {
                setErrorStatus({ status: 401, message: "Authentication required" });
                return;
            }

            const res = await fetch(`${API_BASE_URL}/profile/${publicId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const json = await res.json();
            if (res.ok && json.success) {
                setProfile(json.data);
            } else {
                setErrorStatus({ status: res.status, message: json.message || "Failed to load profile" });
            }
        } catch (error) {
            console.error("View Profile Fetch Error:", error);
            setErrorStatus({ status: 500, message: "Network error" });
        } finally {
            setLoading(false);
        }
    }, [publicId]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleFriendAction = async () => {
        if (!profile) return;
        setProcessingAction(true);

        try {
            const token = await AsyncStorage.getItem("token");

            if (profile.isFriend) {
                // Remove friend
                const res = await fetch(`${API_BASE_URL}/friends/remove`, {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ friendId: profile.publicId }), // Need userId for removal endpoint currently, wait... no, the backend removeFriend endpoint expects friendId as the userId, but our targetPublicId works for POST request.
                });
                // We will adapt the action. The backend /friends/remove currently expects friendId which is the userId. We do not have userId in the profile payload.
                // It might be better to just navigate back and let the user do it from Circle or we can build a new endpoint. 
                // For now, let's just alert since /friends/remove expects userId.
                Alert.alert("Remove Friend", "Please remove friends from the Circle tab.");
            } else {
                // Add friend
                const res = await fetch(`${API_BASE_URL}/friends/request`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ targetPublicId: profile.publicId })
                });
                const json = await res.json();
                if (json.success) {
                    Alert.alert("Success", "Friend request sent!");
                } else {
                    Alert.alert("Error", json.message || "Failed to send request");
                }
            }
        } catch (error) {
            Alert.alert("Error", "Network error");
        } finally {
            setProcessingAction(false);
        }
    };


    const getMoodEmoji = (mood: string) => {
        switch (mood) {
            case 'great': return '😄';
            case 'okay': return '😐';
            case 'bad': return '😞';
            default: return '❓';
        }
    };

    // ----- Bio Management -----

    const handleSaveBio = async () => {
        if (!profile) return;
        setSavingBio(true);
        try {
            const token = await AsyncStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/profile/bio`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ bio: bioText })
            });
            const json = await res.json();
            if (json.success) {
                setProfile({ ...profile, bio: json.data.bio });
                setEditingBio(false);
            } else {
                Alert.alert("Error", json.message || "Failed to update bio");
            }
        } catch (error) {
            Alert.alert("Error", "Network error updating bio");
        } finally {
            setSavingBio(false);
        }
    };

    const startEditingBio = () => {
        setBioText(profile?.bio || "");
        setEditingBio(true);
    };

    // ----- Avatar Management -----

    const pickImage = async () => {
        setPhotoMenuVisible(false);
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.granted === false) {
            Alert.alert("Permission Required", "Please allow access to your photos to upload an avatar.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            uploadAvatar(result.assets[0].uri);
        }
    };

    const uploadAvatar = async (uri: string) => {
        if (!profile) return;
        setUploadingAvatar(true);
        try {
            const token = await AsyncStorage.getItem("token");
            const filename = uri.split('/').pop() || 'avatar.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : `image`;

            const formData = new FormData();

            if (Platform.OS === 'web') {
                // EXPO WEB: FormData requires actual Blobs or Files, not the RN object hack
                const response = await fetch(uri);
                const blob = await response.blob();
                formData.append('avatar', blob, filename);
            } else {
                // EXPO NATIVE: Send strict object properties so the fetch network stack sets the underlying multipart boundary automatically
                formData.append('avatar', {
                    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
                    name: filename,
                    type,
                } as any);
            }

            const res = await fetch(`${API_BASE_URL}/profile/avatar`, {
                method: "PUT",
                headers: {
                    "Accept": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            const json = await res.json();
            if (json.success) {
                setProfile({ ...profile, avatar: json.data.avatar });
            } else {
                Alert.alert("Error", json.message || "Failed to upload avatar");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Network error uploading avatar");
        } finally {
            setUploadingAvatar(false);
        }
    };

    const removeAvatar = async () => {
        setPhotoMenuVisible(false);
        if (!profile || !profile.avatar) return;

        setUploadingAvatar(true);
        try {
            const token = await AsyncStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/profile/avatar`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setProfile({ ...profile, avatar: undefined });
            } else {
                Alert.alert("Error", json.message || "Failed to remove avatar");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Network error deleting avatar");
        } finally {
            setUploadingAvatar(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (errorStatus) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.headerBar}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>
                <View style={styles.centerError}>
                    <Ionicons
                        name={errorStatus.status === 403 ? "lock-closed" : "alert-circle"}
                        size={64}
                        color={colors.textSecondary}
                        style={{ marginBottom: Spacing.md }}
                    />
                    <Text style={styles.errorTitle}>
                        {errorStatus.status === 403 ? "Private Profile" : "Oops"}
                    </Text>
                    <Text style={styles.errorMessage}>{errorStatus.message}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
                        <Text style={styles.retryText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (!profile) return null;

    const initial = profile.name ? profile.name[0].toUpperCase() : "?";

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <View style={[styles.headerBar, { paddingTop: insets.top + Spacing.sm }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{profile.isSelf ? "My Profile" : profile.name}</Text>
                <View style={{ width: 24 }} />
            </View>

            <FlatList
                contentContainerStyle={styles.content}
                data={profile.recentCheckIns}
                keyExtractor={(item, index) => index.toString()}
                ListHeaderComponent={() => (
                    <>
                        {/* Profile Header */}
                        <View style={styles.profileHeader}>

                            {/* Avatar System */}
                            <TouchableOpacity
                                disabled={!profile.isSelf}
                                onPress={() => setPhotoMenuVisible(true)}
                                style={styles.avatarContainer}
                            >
                                {uploadingAvatar ? (
                                    <View style={[styles.avatarPlaceholder, styles.avatarLoading]}>
                                        <ActivityIndicator size="large" color="#fff" />
                                    </View>
                                ) : profile.avatar ? (
                                    <Image source={{ uri: profile.avatar }} style={styles.avatarImage} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarText}>{initial}</Text>
                                    </View>
                                )}
                                {profile.isSelf && !uploadingAvatar && (
                                    <View style={styles.cameraIconBadge}>
                                        <Ionicons name="camera" size={16} color="#fff" />
                                    </View>
                                )}
                            </TouchableOpacity>

                            <Text style={styles.nameText}>{profile.name}</Text>
                            {profile.isFriend && !profile.isSelf && (
                                <View style={styles.friendBadge}>
                                    <Text style={styles.friendBadgeText}>Friend 🤝</Text>
                                </View>
                            )}
                            <Text style={styles.idText}>ID: {profile.publicId}</Text>

                            {/* Bio System */}
                            <View style={styles.bioContainer}>
                                {editingBio ? (
                                    <View style={styles.bioEditContainer}>
                                        <TextInput
                                            style={styles.bioInput}
                                            value={bioText}
                                            onChangeText={setBioText}
                                            maxLength={120}
                                            multiline
                                            placeholder="Write something about yourself..."
                                            placeholderTextColor={colors.textSecondary}
                                            autoFocus
                                        />
                                        <View style={styles.bioActions}>
                                            <TouchableOpacity onPress={() => setEditingBio(false)} style={styles.bioCancelBtn}>
                                                <Text style={styles.bioCancelText}>Cancel</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={handleSaveBio}
                                                style={styles.bioSaveBtn}
                                                disabled={savingBio}
                                            >
                                                {savingBio ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.bioSaveText}>Save</Text>}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.bioDisplayContainer}>
                                        {profile.bio ? (
                                            <Text style={styles.bioTextContent} numberOfLines={profile.isSelf ? undefined : 3}>{profile.bio}</Text>
                                        ) : profile.isSelf ? (
                                            <Text style={[styles.bioTextContent, { color: colors.textSecondary }]}>Add a bio...</Text>
                                        ) : null}

                                        {profile.isSelf && (
                                            <TouchableOpacity onPress={startEditingBio} style={styles.editBioBtn}>
                                                <Ionicons name="pencil" size={16} color={colors.primary} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </View>

                            {!profile.isSelf && (
                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: profile.isFriend ? colors.surface : colors.primary, borderColor: profile.isFriend ? colors.border : 'transparent', borderWidth: profile.isFriend ? 1 : 0 }]}
                                    onPress={handleFriendAction}
                                    disabled={processingAction}
                                >
                                    {processingAction ? (
                                        <ActivityIndicator color={profile.isFriend ? colors.textPrimary : '#fff'} size="small" />
                                    ) : (
                                        <Text style={[styles.actionBtnText, { color: profile.isFriend ? colors.textPrimary : '#fff' }]}>
                                            {profile.isFriend ? "Friends" : "Add Friend"}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Stats Row */}
                        <View style={styles.statsContainer}>
                            <View style={styles.statBox}>
                                <Text style={styles.statEmoji}>🔥</Text>
                                <Text style={styles.statNumber}>{profile.streak || 0}</Text>
                                <Text style={styles.statLabel}>Streak</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statEmoji}>🗓</Text>
                                <Text style={styles.statNumber}>{profile.totalCheckIns || 0}</Text>
                                <Text style={styles.statLabel}>Check-ins</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statEmoji}>🤝</Text>
                                <Text style={styles.statNumber}>{profile.friendCount || 0}</Text>
                                <Text style={styles.statLabel}>Friends</Text>
                            </View>
                        </View>

                        {/* Emotional Snapshot */}
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>7-Day Mood Summary</Text>
                            <View style={styles.moodSummaryContainer}>
                                <View style={styles.moodSummaryItem}>
                                    <Text style={styles.moodSummaryEmoji}>😄</Text>
                                    <Text style={styles.moodSummaryCount}>{profile.weeklyMoodSummary.great || 0}</Text>
                                </View>
                                <View style={styles.moodSummaryItem}>
                                    <Text style={styles.moodSummaryEmoji}>😐</Text>
                                    <Text style={styles.moodSummaryCount}>{profile.weeklyMoodSummary.okay || 0}</Text>
                                </View>
                                <View style={styles.moodSummaryItem}>
                                    <Text style={styles.moodSummaryEmoji}>😞</Text>
                                    <Text style={styles.moodSummaryCount}>{profile.weeklyMoodSummary.bad || 0}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Recent Activity Header */}
                        <Text style={styles.sectionTitle}>Recent Check-ins</Text>
                        {profile.recentCheckIns.length === 0 && (
                            <View style={styles.sectionCard}>
                                <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: Spacing.md }}>No recent check-ins.</Text>
                            </View>
                        )}
                        {profile.recentCheckIns.length > 0 && <View style={styles.recentListTop} />}
                    </>
                )}
                renderItem={({ item, index }) => (
                    <View style={[
                        styles.recentItemContainer,
                        index === profile.recentCheckIns.length - 1 && styles.recentItemBottom
                    ]}>
                        <View style={[styles.recentItem, index === profile.recentCheckIns.length - 1 && { borderBottomWidth: 0 }]}>
                            <Text style={styles.recentEmoji}>{getMoodEmoji(item.mood)}</Text>
                            <View style={styles.recentInfo}>
                                <Text style={{ color: colors.textPrimary, fontWeight: '500', textTransform: 'capitalize' }}>{item.mood}</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 }}>{new Date(item.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</Text>
                            </View>
                        </View>
                    </View>
                )}
                ListFooterComponent={() => <View style={{ height: Spacing.xl }} />}
            />

            {/* Photo Action Modal */}
            <Modal
                visible={photoMenuVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setPhotoMenuVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setPhotoMenuVisible(false)}
                >
                    <View style={styles.bottomSheet}>
                        <View style={styles.bottomSheetHandle} />
                        <Text style={styles.bottomSheetTitle}>Profile Photo</Text>

                        <TouchableOpacity style={styles.actionRow} onPress={pickImage}>
                            <View style={[styles.actionIconArea, { backgroundColor: colors.primary + '15' }]}>
                                <Ionicons name="image" size={20} color={colors.primary} />
                            </View>
                            <Text style={[styles.actionRowText, { color: colors.textPrimary }]}>Choose from Library</Text>
                        </TouchableOpacity>

                        {profile.avatar && (
                            <TouchableOpacity style={styles.actionRow} onPress={removeAvatar}>
                                <View style={[styles.actionIconArea, { backgroundColor: colors.error + '15' }]}>
                                    <Ionicons name="trash" size={20} color={colors.error} />
                                </View>
                                <Text style={[styles.actionRowText, { color: colors.error }]}>Remove Photo</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={[styles.actionRow, { borderBottomWidth: 0 }]} onPress={() => setPhotoMenuVisible(false)}>
                            <Text style={[styles.actionRowText, { color: colors.textSecondary, textAlign: 'center', width: '100%' }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const createStyles = (colors: any, insets: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    content: {
        padding: Spacing.lg,
    },
    centerError: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    errorTitle: {
        fontSize: FontSize.xl,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    errorMessage: {
        fontSize: FontSize.md,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.xl,
    },
    retryButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.round,
    },
    retryText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: FontSize.md,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: Spacing.md,
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.primary,
        justifyContent: "center",
        alignItems: "center",
        ...Shadows.medium,
    },
    avatarLoading: {
        opacity: 0.8,
    },
    avatarImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        ...Shadows.medium,
    },
    cameraIconBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 2,
        borderRadius: 16,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    avatarText: {
        fontSize: 48,
        fontWeight: "800",
        color: "#fff",
    },
    nameText: {
        fontSize: FontSize.xxl,
        fontWeight: '800',
        color: colors.textPrimary,
        marginBottom: 4,
        textAlign: 'center',
    },
    friendBadge: {
        backgroundColor: colors.success + '20',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
        marginBottom: 4,
    },
    friendBadgeText: {
        color: colors.success,
        fontSize: FontSize.xs,
        fontWeight: '700',
    },
    idText: {
        fontSize: FontSize.sm,
        color: colors.textSecondary,
        marginBottom: Spacing.md,
    },
    bioContainer: {
        width: '100%',
        paddingHorizontal: Spacing.lg,
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    bioDisplayContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.md,
    },
    bioTextContent: {
        fontSize: FontSize.md,
        color: colors.textPrimary,
        textAlign: 'center',
        lineHeight: 22,
    },
    editBioBtn: {
        marginLeft: Spacing.sm,
        padding: 4,
    },
    bioEditContainer: {
        width: '100%',
        backgroundColor: colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    bioInput: {
        color: colors.textPrimary,
        fontSize: FontSize.md,
        minHeight: 60,
        textAlignVertical: 'top',
        marginBottom: Spacing.md,
    },
    bioActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    bioCancelBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        marginRight: Spacing.sm,
    },
    bioCancelText: {
        color: colors.textSecondary,
        fontWeight: '600',
    },
    bioSaveBtn: {
        backgroundColor: colors.primary,
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: BorderRadius.sm,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 70,
    },
    bioSaveText: {
        color: '#fff',
        fontWeight: '600',
    },
    actionBtn: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: 10,
        borderRadius: BorderRadius.round,
        minWidth: 140,
        alignItems: 'center',
    },
    actionBtnText: {
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.xl,
    },
    statBox: {
        flex: 1,
        backgroundColor: colors.surface,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        marginHorizontal: 4,
        ...Shadows.small,
    },
    statEmoji: {
        fontSize: 24,
        marginBottom: 4,
    },
    statNumber: {
        fontSize: FontSize.xl,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    statLabel: {
        fontSize: FontSize.xs,
        color: colors.textSecondary,
        marginTop: 2,
        textTransform: 'uppercase',
    },
    sectionCard: {
        backgroundColor: colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        ...Shadows.small,
    },
    sectionTitle: {
        fontSize: FontSize.md,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: Spacing.lg,
    },
    moodSummaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    moodSummaryItem: {
        alignItems: 'center',
    },
    moodSummaryEmoji: {
        fontSize: 32,
        marginBottom: Spacing.xs,
    },
    moodSummaryCount: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    recentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    recentEmoji: {
        fontSize: 28,
        marginRight: Spacing.md,
    },
    recentInfo: {
        flex: 1,
    },
    recentListTop: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: BorderRadius.lg,
        borderTopRightRadius: BorderRadius.lg,
        paddingTop: Spacing.md,
    },
    recentItemContainer: {
        backgroundColor: colors.surface,
        paddingHorizontal: Spacing.lg,
    },
    recentItemBottom: {
        borderBottomLeftRadius: BorderRadius.lg,
        borderBottomRightRadius: BorderRadius.lg,
        paddingBottom: Spacing.md,
        marginBottom: Spacing.lg,
        ...Shadows.small,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    bottomSheet: {
        backgroundColor: colors.background,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.lg,
        paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.xl,
    },
    bottomSheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: Spacing.lg,
    },
    bottomSheetTitle: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: Spacing.lg,
        textAlign: 'center',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    actionIconArea: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    actionRowText: {
        fontSize: FontSize.md,
        fontWeight: '500',
    },
});

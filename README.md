# Checkin'in

> Stay connected with your circle by simply checking in every day.

Checkin'in is a mobile-first social wellness app that lets you and your friends share a daily mood check-in. It's low-pressure, intentional, and private — no feeds, no likes, just a simple signal that says *"I'm here."*

---

## What it does

Every day, users open the app and log how they're feeling: **great**, **okay**, or **bad**. They can also leave a short daily thought (up to 400 characters). Friends in their circle can see each other's check-in status and thoughts in real time through the Emotional Presence feed.

Core features:

- **Daily check-ins** — one mood log per day per user (great / okay / bad), upsertable throughout the day
- **Daily thoughts** — a short text reflection attached to each day
- **Emotional Presence feed** — see your circle's latest check-in status and thoughts at a glance
- **Friend system** — send/accept/decline friend requests by unique public ID (format: `CIN_XXXXXX`), remove friends, search by ID
- **Check-in history** — view your own or a friend's check-in log, subject to privacy settings
- **Profile & avatar** — name, bio, age, profile photo (uploaded to Cloudinary)
- **Privacy controls** — per-user visibility for profile, check-ins (`public` / `friends` / `private`), friend request permissions, searchability
- **Push notifications** — daily reminder at a user-configured time via Expo Push Notifications
- **Authentication** — email/password signup + login, Google OAuth (Android & Web), forgot/reset password via email
- **Light/dark theme** — system-aware with manual override

---

## Tech stack

### Frontend — React Native (Expo)

| | |
|---|---|
| Framework | Expo ~54 / React Native 0.81.5 |
| Language | TypeScript |
| Navigation | Expo Router ~6 (file-based) + React Navigation |
| State | React hooks + AsyncStorage |
| Auth | `expo-auth-session` (Google OAuth), JWT stored in AsyncStorage |
| Notifications | `expo-notifications` |
| UI | Custom theme system (`constants/theme.ts`), Ionicons, `react-native-reanimated` |
| Image upload | `expo-image-picker` → multipart POST to backend |

### Backend — Node.js / Express

| | |
|---|---|
| Runtime | Node ≥ 20 |
| Framework | Express 5 |
| Database | MongoDB via Mongoose 9 |
| Auth | JWT (`jsonwebtoken`), bcrypt, Google OAuth (`google-auth-library`) |
| File storage | Cloudinary (via `multer-storage-cloudinary`) |
| Email | Nodemailer (SMTP) |
| Push | Expo Server SDK |
| Cron | `node-cron` — hourly reminder job |
| Security | `helmet`, `cors`, `express-rate-limit`, `express-validator` |
| Dev | `nodemon` |

---

## Data model

The `User` document is the heart of the app:

```
User
├── userId          — internal UUID
├── publicId        — "CIN_XXXXXX", used for friend search/add
├── email / password / authProvider ("email" | "google")
├── name, bio, age, avatar (Cloudinary URL)
├── expoPushToken, timezone, lastReminderSent
├── friends         — [userId]
├── friendRequests  — { sent: [userId], received: [userId] }
├── dailyThoughts   — [{ date, thought, timestamp }]
├── checkIns        — [{ date, mood: "great"|"okay"|"bad", timestamp }]
├── privacy         — { profileVisibility, checkinVisibility,
│                       friendRequestPermission, searchable, showLastSeen }
└── settings        — { theme, reminderEnabled, reminderTime, notifications }
```

---

## API routes

All protected routes require `Authorization: Bearer <token>`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/signup` | — | Register with email + password |
| POST | `/auth/login` | — | Login, returns JWT |
| POST | `/auth/google` | — | Google OAuth token exchange |
| POST | `/auth/forgot-password` | — | Send reset email |
| POST | `/auth/reset-password` | — | Apply new password with token |
| GET | `/profile/me` | ✓ | Get own profile |
| PUT | `/profile` | ✓ | Edit profile fields |
| POST | `/profile/avatar` | ✓ | Upload avatar (multipart) |
| POST | `/checkin` | ✓ | Log or update today's check-in |
| GET | `/checkin` | ✓ | Get check-ins (self or friend) |
| GET | `/history` | ✓ | View check-in history |
| GET | `/emotional-presence` | ✓ | Friend circle presence feed |
| GET | `/friends` | ✓ | Get friends list + data |
| GET | `/friends/feed` | ✓ | Circle activity feed |
| POST | `/friends/request` | ✓ | Send friend request by publicId |
| POST | `/friends/respond` | ✓ | Accept or decline request |
| DELETE | `/friends/remove` | ✓ | Remove a friend |
| GET | `/friends/search/:publicId` | ✓ | Find user by public ID |
| GET/PUT | `/settings` | ✓ | Get or update app settings |
| GET | `/health` | — | Health check |

Rate limits: auth routes → 20 req / 15 min. All other routes → 100 req / min.

---

## Getting started

### Prerequisites

- Node ≥ 20
- MongoDB instance (local or Atlas)
- Expo CLI (`npm install -g expo-cli`) or use `npx expo`
- A Cloudinary account (for avatar uploads)
- An SMTP server or service like Resend/Mailgun (for password reset emails)

### Backend setup

```bash
cd Backend
cp .env.example .env   # fill in your values
npm install
npm run dev            # starts with nodemon
```

The server starts on port `3000` by default.

#### Required environment variables

```env
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret
```

#### Optional environment variables

```env
PORT=3000
GOOGLE_CLIENT_ID=...
GOOGLE_ANDROID_CLIENT_ID=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=noreply@yourdomain.com
FRONTEND_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com
```

### Frontend setup

```bash
cd Frontend
npm install
```

Update `constants/api.ts` to point at your backend:

```ts
export const API_BASE_URL = "https://your-backend-url.com";
```

Then run:

```bash
npm run android   # Android emulator or device
npm run ios       # iOS simulator (macOS only)
npm run web       # Browser
```

> For physical device testing, ensure your device and dev machine are on the same network, or use the deployed backend URL.

---

## Deployment

The backend is configured for **Render** (the root route returns a welcome JSON and `/health` is available for uptime checks). Any Node-compatible host works.

The frontend is built and distributed via **EAS Build** — see `eas.json` for build profiles.

```bash
# Build for production
eas build --platform android
eas build --platform ios
```

---

## Notes & known limitations

- iOS Google OAuth client ID is a placeholder (`YOUR_IOS_CLIENT_ID`) — replace before building for iOS.
- The `circle` field on the User model is a legacy alias for `friends`, kept for migration safety and can be removed once data is fully migrated.
- Push notifications rely on Expo's push service; physical devices are required for full testing.
- The `home.tsx` screen is a stub ("HOME SCREEN 🔥") — the main experience is in the profile and emotional presence screens.

---
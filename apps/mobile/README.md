# AfroStream Mobile (React Native) — placeholder

The mobile app is a separate, multi-week build that is **not in this scaffold**.
The web app is mobile-responsive, so all MVP features can be demoed from a phone browser today.

## Recommended path when starting the RN app

1. `npx create-expo-app afrostream-mobile -t expo-template-blank-typescript`
   (Expo SDK is the fastest path; ejects later if needed.)
2. Reuse `apps/web/src/lib/api.ts` as the contract — copy it across, swap `localStorage` for
   `expo-secure-store`, and rebrand as `apps/mobile/src/lib/api.ts`.
3. Mirror screens 1:1 from web:
   - Auth (login/register)
   - Home / Search / Library
   - Artist Studio (upload via `expo-document-picker`, AI tools)
   - Music Player (use `expo-av` for streaming with range support)
   - Support
4. Wire deep links so push notifications can land users on a track or playlist.

## Open questions to resolve before building

- Do we ship Expo Go for fan/internal testing, or go straight to native builds via EAS?
- Push notification provider (Expo, OneSignal, FCM/APNS direct)?
- Offline caching policy (size limits, encryption, expiry)?
- App store identities (bundle IDs, signing certs, dev accounts)?

These are budget and ops decisions, not code, and should be made before we open the RN repo.

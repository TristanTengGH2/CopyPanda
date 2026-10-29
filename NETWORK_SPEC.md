# CopyPanda accounts and shared study rooms

This is the accepted next milestone after the personal overlay previews. It
extends SPEC.md and OVERLAY_SPEC.md; networked features are live only after
the backend is configured and their end-to-end checks pass.

## Accounts and local study

- Solo study remains usable offline without creating an account.
- Optional email-code sign-in links the web app and Windows overlay to one
  private user ID. Email addresses never appear to room participants.
- Guest room membership may use an anonymous authenticated identity; no email
  is needed just to sit with friends. Guests are clearly told when their
  identity cannot be recovered on another device.
- A guest may attach a verified email to preserve the same identity. Signing
  into an existing account requires an explicit import choice for local data.
- Signing out keeps local study available and separates it from the previous
  account. Account A's notes or pending rewards must never enter account B.
- Authentication codes, access tokens, and refresh tokens are never put in
  Git, QR payloads, room codes, logs, or shared profile data.

## Cloud progress and rewards

- One backend ledger is authoritative for a signed-in user's shared leaves.
- Sync session records, notes, bookmarks, and study goals between clients.
  Cosmetics will use the same user ID when a wardrobe exists.
- Every session has a stable ID. Retrying or uploading the same session from
  another device cannot award it twice. Manual entries and demos earn nothing.
- Recompute rewards from eligible session records, not a submitted wallet
  number. Completion uses the agreed full-minute base plus rounded-up 10%.
- Guest/offline imports are explicitly identified as self-reported records,
  validated, and deduplicated. This is self-accountability, not proof of study.
  Never claim input monitoring or cheat-proof offline verification.
- Do not double-count overlapping rewarded sessions on the same account.
- Failed sync keeps a pending local queue. Reconnection retries with the
  original IDs. Paused or closed time never becomes study time.
- Notes/goals/bookmarks use revision checks. A change from another device
  must not silently overwrite unsynced local edits; offer a conflict choice.
- Initial private-state sync excludes machine-specific window placement,
  accessibility settings, camera permissions, and other device preferences.

## Creating and joining rooms

1. Create an online or in-person room with a chosen display name.
2. The backend returns a QR invitation, copyable link, and an 8-character code
   using an unambiguous alphabet. All three identify the same room.
3. A friend scans, opens the link, or types the code, then explicitly joins.
4. Independent timers remain the default. Joining never replaces a running
   personal timer. Leaving is always available.

- QR payload: a hosted join URL with an opaque random invitation token in
  its fragment. It contains no email, private notes, GPS, or identity token.
- Invitations expire after 10 minutes. Host renewal revokes the previous
  invitation; current members stay joined. Rooms expire after 6 hours.
- First room capacity: 8 members. Only members can read live presence.
- Rate-limit creation and code lookup, including invalid guesses. Return a
  generic invalid/expired response instead of exposing room details.
- Host can rotate invitations or close the room. Membership ends on leave,
  closure, or expiry. A host leaving closes the initial implementation's room.

## Scanning and in-person check-in

- Phone cameras may open the invite through the operating system's scanner.
- In-app scanning requests camera permission only after Scan is selected.
  Decode locally; never upload video. Stop tracks when the dialog closes,
  scanning finishes, or the page is hidden. A local QR image is another option.
- Always show manual code entry and a copyable link beside QR.
- A scanner accepts only CopyPanda invite links or supported room codes.
- In-person check-in is honor based. A QR screenshot can be shared remotely;
  do not describe it as verified proximity. Collect no location data.

## Presence and shared timers

- Publish only alias, focus/break/paused/away state, timer remaining, and the
  explicit choice to join a synchronized session. Intentions stay private
  unless a separate sharing control is deliberately enabled later.
- Presence refreshes about every 10 seconds and becomes away after 30 seconds
  without a heartbeat. Presence must not imply a disconnected user is active.
- A member proposes a duration and future start. Each participant accepts or
  declines; a timer already in progress requires an explicit finish/leave step.
- A personal pause affects only that participant. Group pause is a request
  that expires after 30 seconds and applies only when all active opted-in
  members agree. Leaving sync does not leave the room or erase accrued study.
- Server time anchors a shared start. Reward calculations still follow each
  participant's actual active time and eligible overlap.
- Online overlap bonus is 10%; trust-based in-person adds 5%, never compounded.
  Heartbeat gaps, pauses, breaks, and disconnected intervals do not count.

## Delivery and verification

- Supabase project name: `copypanda`; organization display name: `CopyPanda`.
- Managed authentication, private Postgres records, row-level security,
  restricted backend operations, and server-generated invitations.
- Browser and native clients use the same documented API and reward rules.
- No service-role/admin credential may be bundled into either client.
- Verify two separate client identities, same-account cross-device reads,
  duplicate reward retries, unauthorized access, invite expiry/rotation,
  manual joins, locally decoded QR, disconnects, sign-out isolation, and
  concurrent private-state edits before advertising working cloud sync.
- GitHub Pages remains the web host. Only CopyPanda-web deploys the website;
  backend code/schema belongs in the original CopyPanda repository.

## Preview rollout status (October 29, 2026)

Guest rooms, code/link/QR invitations, presence, optional shared starts, and group pause voting are enabled. Email sign-in remains pending by user choice until a custom sender is configured. Keep `emailEnabled` false in both clients. Leaves and history remain local in this preview; included account-sync code requires end-to-end email and two-device verification before enablement. The Windows preview keeps authentication tokens in memory, so guest room identity lasts for the app run.

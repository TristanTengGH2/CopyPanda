# CopyPanda cloud service

The Supabase project belongs to the **CopyPanda** organization. It serves both
the original repository's Godot overlay and the separately hosted CopyPanda-web.
Clients contain only a public publishable key. No service-role key is needed.

## Current rollout

Guest rooms, eight-character join codes, locally generated QR invitations,
presence, invitation renewal, and optional shared starts are enabled.
The website can scan a QR using an image or an explicitly requested camera.
The Windows app displays QR invitations and accepts codes/links; it does not
open a camera. In-person status is an honor-based check-in, never GPS proof.

**Email sign-in remains disabled by user choice until an email sender is set up.**
Account-scoped sync code is included for that next step but is not advertised
as available. Leaves and study records currently stay local. Native guest
identity lasts for the app run; browser guest identity lasts in site storage.

## Installation

1. Create a Supabase project with anonymous sign-ins enabled.
2. Run `supabase/migrations/202610290001_network.sql` in SQL Editor as owner.
   It can be rerun safely. Never expose the `cp_private` schema through Data API.
3. Put the project URL and **public publishable key** in `web/cloud-config.js`
   and `overlay/cloud-config.json`. Set `appUrl` to the hosted web root.
4. Keep `emailEnabled` false until SMTP and email delivery have been tested.

To enable accounts later, configure a sender in Authentication > SMTP, set
the site URL to the web app, and configure sign-up, magic-link, and change-email
templates to display `{{ .Token }}`. Test signup, existing-account login,
guest linking, recovery, sign-out, and two actual devices before setting
`emailEnabled: true` in both clients. Never add SMTP secrets to either repo.
The native preview holds tokens in memory and asks for sign-in after restart.

## API

Authenticated clients call `POST /rest/v1/rpc/cp_api` with
`{"operation":"room.get","payload":{"roomId":"…"}}`. Supabase anonymous
identities use the authenticated role, while unauthenticated calls are denied.
Failures use `{ok:false,code,message}`; private-state conflicts also return
the current `data` and `revision` for an explicit choice.

| Operation | Purpose |
|---|---|
| `bootstrap`, `history.list` | Private profile, wallet, paginated canonical records |
| `state.put` | Compare-and-swap notes/bookmark/goal using `revision` |
| `record.import` | Deduplicate session ID and recalculate eligible leaves |
| `room.create`, `room.join` | Create/join online or in-person room |
| `room.get`, `room.heartbeat` | Member-only presence; device ID protects active focus |
| `room.rotate`, `room.leave` | Renew invitations or leave; host departure closes room |
| `sync.propose`, `sync.accept`, `sync.leave` | Optional future shared start |
| `sync.pause_request`, `sync.pause_vote` | Expiring unanimous group-pause vote |

Invitations expire after ten minutes; rooms after six hours. Rotating an
invitation revokes its old code/token without ejecting members. Presence is
away after thirty seconds. Only member aliases, public room IDs, study state,
and remaining time enter presence; no notes, email, or account UUIDs do.

Rewards are calculated in the database, with repeated or overlapping rewarded
records refused extra credit. Actual heartbeat overlap adds modest 10% online
and 5% in-person bonuses, without multiplying for group size. Offline history
is self-reported: this is not a cheat-proof economy. A public launch still
needs abuse monitoring, guest-account cleanup/retention, account deletion/export,
and tested email delivery. No payments or purchasable balance are enabled.

## Checks

```sh
cd backend
npm install
npm test
```

Tests run the migration in an isolated PostgreSQL-compatible PGlite instance.
They exercise access restrictions, private state, conflicts, canonical rewards,
retries, overlap, room capacity/expiry, invitation rotation, rate limits,
device presence, pagination, and optional shared-timer voting.

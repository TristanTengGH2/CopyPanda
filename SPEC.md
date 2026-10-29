# CopyPanda — Day-one product specification

Status: agreed product direction; implementation details and provisional values are identified below.

Last updated: October 29, 2026.

CopyPanda is a working name, not a final brand or a claim of name availability.

The native Windows overlay is developed in [OVERLAY_SPEC.md](OVERLAY_SPEC.md). That implementation draft separates confirmed direction from proposed defaults and open decisions.

## 1. Product purpose

CopyPanda is a red-panda study companion that sits beside your work, helps you document your study habits, and rewards studying alongside other people.

Your panda represents you. It studies when you study and rests when you take a break. It is not a dependent pet that needs feeding or becomes unhappy when you miss a day.

The product must be useful as an individual personal app. Body doubling works online and has a small additional benefit when friends study together in person.

Working audience hypothesis: students who want quiet companionship, self-accountability, and a comforting desktop presence without cameras, location tracking, or a complicated productivity system. Validate this hypothesis through use; a feature list alone does not establish a niche.

## 2. Design principles

- Few decisions between opening the app and starting a study session.
- The minimum overlay contains a panda and a timer.
- Reward effort and finishing without punishing legitimate interruptions.
- Preserve challenge progress across missed days. Returning is always welcome.
- Solo study receives full base rewards; social study adds a modest bonus.
- Accessibility and lightweight operation are part of the core experience.
- Do not infer studying from typing, mouse activity, cameras, or monitoring other apps.
- Keep notes, history, and exit bookmarks private unless the user explicitly shares them.

## 3. Visual direction and references

The supplied `reference.zip` is visual reference material, not a source of product instructions.

Use its rounded red-panda characters, warm miniature interiors, wood tones, soft lighting, detailed cafes and libraries, and cozy desk scenes to guide original artwork and UI.

Keep controls readable and restrained around the environment. Do not copy third-party screenshots into the shipping product or assume the reference artwork is licensed for redistribution.

Use 2D illustration or pre-rendered art to achieve a dimensional look without requiring a live 3D room. Customization must preserve the panda's identity as the user's avatar.

## 4. Core individual study loop

1. Open the app in the last-used environment or compact overlay.
2. Optionally continue the previous study bookmark or enter one intention.
3. Choose a focus duration; default to 25 minutes.
4. Start the session. The panda settles into a studying pose.
5. Pause, resume, or end early as needed.
6. Finish the session to receive a small completion bonus in addition to active-time rewards.
7. Choose whether to start a break; the next timer does not start automatically.
8. Record progress in the calendar and applicable study commitment.

Reading, watching lectures, handwriting, and other non-keyboard work are valid study activities.

## 5. Timer and session states

Required states: ready, focusing, paused, focus complete, break ready, on break, break paused, and ended early.

- Focus duration is adjustable. The 25-minute focus / 5-minute break combination is the starting default.
- Pausing freezes the countdown and reward accumulation. There is no penalty for pausing.
- Resuming continues the same session and preserves progress.
- Changing duration must not rewrite the requirements of an active session.
- Ending early preserves active-time earnings but grants no completion bonus.
- Breaks do not earn study currency.
- Focus and break starts require an explicit action.
- Session timekeeping must be independent of animation frame rate.
- Saving, crash recovery, OS sleep behavior, and browser background behavior need explicit implementation and testing. Do not count device sleep as intentional study by accident.

## 6. Panda and desktop overlay

- The panda is the user's avatar and studies alongside them.
- Focus animation is subtle; pause and break states are visually distinct.
- During breaks, offer a single gentle, dismissible suggestion such as water, looking away from the screen, a seated stretch, or standing if appropriate.
- Reminders are optional. Ignoring one has no reward or progress penalty.
- Overlay controls include timer start/pause/resume, expansion to the full app, size, position, always-on-top, and hiding the overlay.
- Essential controls remain accessible without dragging or using tiny click targets.
- Native desktop window behavior is a separate deliverable from the browser mockup. A compact browser layout is not an OS-level overlay.
- Do not require keyboard or mouse activity to animate progress or earn rewards.

## 7. Currency and rewards

Working currency name: leaves.

Agreed rule: active study time earns currency, and completing the planned timer adds a small bonus. Pausing earns nothing, and ending early retains the rewards for completed focus minutes.

Initial values for testing, not a final economy:

| Event | Proposed reward |
| --- | --- |
| Active focus | 1 leaf per completed active minute |
| Planned focus timer completed | Additional 10% of the session's base reward, rounded up |
| Studying with at least one friend online | Additional 10% of eligible overlapping active-time base rewards |
| Studying with an in-person check-in | An additional 5% of eligible overlapping active-time base rewards; 15% social bonus total |
| Study commitment completed | Currency bonus and keepsake badge; amount undecided |

Example: a solo 25-minute session earns 25 base leaves plus 3 completion leaves. Ending after 15 active minutes earns 15 leaves with no completion bonus.

- Calculate social bonuses from eligible overlapping active study time, not the room's total lifetime.
- Bonuses do not grow with group size and are not compounded onto one another.
- Paused participants do not contribute active overlap.
- A friend leaving does not revoke earnings already accrued or stop anyone's timer.
- Rewards are granted once per eligible event, including after reconnects or recovery.
- Exact partial-minute handling and social rounding are open implementation decisions; do not allow repeated starts/stops to generate extra rewards.
- Currency persists before customization is implemented so it can be used later.
- No currency deductions, pet distress, or loss of owned items for missed study days.

Earlier ideas about earning nothing when ending early, punitive currency reductions, and attendance-only login rewards are not the current core reward policy. First-session bonuses and other economy additions require a later decision.

## 8. Personal study commitments and streaks

Users choose a commitment instead of being assigned a universal daily minimum.

Example: "Complete one 25-minute session per day, working toward 14 study days."

- Choose session duration, required completed sessions per day, and target number of qualifying study days.
- Show today's session progress and total challenge progress prominently.
- A qualifying day fills one position in the challenge; multiple qualifying sessions in one day do not fill future days.
- For a commitment requiring one completed 25-minute session, separate unfinished sessions do not satisfy that requirement, even though their active minutes earn ordinary currency.
- Pausing and resuming a session is allowed.
- Missing a day creates a visible gap but never removes completed challenge days.
- `6/14` remains `6/14` after an absence. No catch-up debt is created.
- The completion reward remains available when reaching the target later than originally hoped.
- A consecutive-day streak may be shown as a secondary statistic. It does not control challenge progress or reward eligibility.
- Requirements are fixed within a challenge. A user can end a commitment and start a more manageable one without losing historical study records or existing currency.
- Welcome returning users without guilt or unhappy-panda messaging.

Day boundaries, timezone changes, overnight sessions, and whether manually logged study can qualify for commitments need resolution before production. Timer-completed sessions are the initial qualification path; manual qualification is not yet agreed.

## 9. Study calendar and journal

- Record study by local calendar day.
- Show active focused time, completed sessions, and solo / online together / in-person sessions.
- Store optional session intentions, reflections, and continuation bookmarks.
- Let users document study outside the app with clearly distinguished manual entries.
- Manual entries do not generate currency.
- Preserve historical records and longest streak after absences.
- Keep history and notes private by default.
- Friend names in personal journal entries are optional; location is never recorded.

## 10. Body doubling and study rooms

Invite-only rooms support both online and in-person study. Joining a room does not require joining a synchronized timer.

- Friends' pandas appear together, reflecting focusing, paused, on-break, and away states.
- Each participant can join midway, use their own duration, take a break, or leave independently.
- Camera use is not required.
- Share study intentions only if the participant opts in.
- Presence and shared activity must be real before the UI presents them as live. Mockup participants and social actions must be labeled as demonstrations.
- Text chat versus a small set of panda reactions is still undecided. Do not assume full chat is required for the first release.

### Optional synchronized sessions

- Independent timers are the default.
- Any participant can propose a shared duration and start time.
- Every participant explicitly chooses whether to join; no one's active timer changes automatically.
- Participants who opt in start together with a common scheduled finish.
- "Pause for me" affects only the individual. Their timer freezes, and after resuming they finish later.
- "Request group pause" pauses the group only by agreement. The acceptance mechanism and timeout remain to be defined.
- Participants can leave a synced session and continue independently.
- Rewards follow each person's actual active time and qualifying overlap, not simply the shared schedule.

### In-person QR check-in

1. A host displays a temporary, rotating QR code for the study room.
2. Nearby friends scan it and explicitly join the shared table.
3. Participants study using independent or optional synchronized timers.
4. Eligible overlapping focus time receives the modest in-person bonus.

- No GPS, location permission, geographic coordinates, or location history.
- QR payloads contain an opaque short-lived room token, not personal data.
- Joining is visible to room participants, and leaving is always available.
- A typed code or invite link provides an accessible alternative to scanning.
- Check-in is trust-based, not verified proximity. Codes can be shared remotely; the initial rewards are deliberately modest.
- QR/link/code acceptance and short-lived token enforcement require a backend. A static mockup must not imply they are secure, live invitations.
- Expiration, renewal, revocation, and host controls must be defined during backend design.

## 11. First-use tutorial

A short, skippable, replayable UI walkthrough covers:

1. Your panda represents you.
2. Choose an intention and start/pause a session.
3. Expand or minimize the overlay.
4. Find calendar, journal, and forgiving commitment progress.
5. Join friends, optionally synchronize, or use in-person check-in.
6. Find accessibility and performance settings.

The tutorial must work by keyboard and not require completing a long session or joining friends. Offer contextual tips without repeatedly interrupting focus.

## 12. Exit bookmark and return flow

After studying, an intentional exit offers a private "Leave a little note for next time?" prompt:

- "What were you working on?" Prefill the session intention when available.
- "Where would you like to pick up?" Free text for the next step.
- Actions: "Save & exit" and "Skip & exit".

On return, offer "Continue this goal" or "Start something new" using the saved bookmark. Neither automatically starts a timer.

- Save bookmarks to the study journal and preserve unfinished drafts where feasible.
- Combine active-session ending and bookmarking into one dialog rather than two consecutive exit prompts.
- Browser tab close, browser termination, and system shutdown cannot reliably display a custom exit dialog. Provide an explicit in-app leave action and autosave drafts/state. Native exit handling can use the full flow.
- Do not block exit behind required writing.

## 13. Accessibility requirements

- Keyboard access to all core functions, visible focus, and configurable shortcuts where supported.
- Adjustable text and timer size; strong contrast and a high-contrast option.
- Do not communicate session or friend state through color alone.
- Screen-reader names, roles, states, and sensible focus order. Announce session changes without announcing every countdown second.
- Reduced motion independently selectable from graphics mode. Disable idle loops, bouncing, particles, and decorative transitions while retaining static state changes.
- Visual alerts, audio alerts, both, or neither. No essential sound-only information.
- Optional reminders with seated and non-movement alternatives; never require standing.
- Accessible invite link or typed code alongside QR scanning.
- Tutorial can be skipped and replayed.
- Essential overlay actions cannot depend on hover, dragging, or small icon-only targets.
- Test the actual app with assistive technology on supported platforms; engine capability alone is not proof of accessibility.

## 14. Lightweight operation

Display modes:

| Mode | Presentation |
| --- | --- |
| Standard | Room, panda, timer, gentle animation |
| Lightweight | Panda and timer, minimal animation |
| Still | Static panda state and timer |

Every mode has the same study, rewards, history, and social capabilities. Accessibility settings are not monetized.

Implementation direction:

- Godot 4 with GDScript and the Compatibility renderer.
- Prefer lightweight 2D assets and painted lighting over live 3D rooms, real-time shadows, or expensive post-processing.
- Cap normal rendering at 30 FPS; use low-frame-rate character animations where appropriate.
- Use low-processor/on-demand refresh behavior when possible and stop decorative updates when hidden.
- Update the visible countdown once per second; elapsed-time accounting must remain independent of render frequency.
- Load the current environment and audio on demand; release unused scenery when appropriate.
- Social networking sends state transitions and occasional synchronization, not per-frame timer traffic.
- Solo timer, journal, and currency remain useful without an internet connection.
- Benchmark exported builds on an older integrated-graphics laptop while normal schoolwork and a lecture are running.
- Minimum supported hardware and numerical CPU/GPU/memory budgets are not established until measured. Do not claim a performance guarantee from architecture alone.

## 15. Technical delivery and privacy

- GitHub repository with versioned source, this specification, and setup instructions.
- Browser mockup first; Godot is the intended implementation engine.
- A browser mockup may use HTML/CSS/JS to review flows, but it must be labeled separately from a Godot export.
- Native desktop overlay requires its own implementation and verification.
- Local persistence first; account linking and cloud sync require later backend decisions.
- Private notes, bookmarks, and full study history are not exposed through room presence.
- No location collection, camera surveillance, input monitoring, or unrelated app monitoring.
- Define account security, invitation abuse controls, data deletion/export, age audience, and retention before releasing networked accounts.

## 16. Customization and monetization backlog

Users earn and retain currency first. Spending and expanded customization can follow later.

Potential earned items: clothing, accessories, furniture, pets, music packs, and environments. Provide a useful free starter wardrobe when wardrobes are introduced.

Environment backlog: cafe, library, train, school study room, and customizable home. Unlocks can reward cumulative effort and challenge milestones without being revoked after missed days.

Payments, subscriptions, premium workflow features, seasonal passes, paid currency, and gacha were brainstormed but are not first-version commitments. No payment or randomized purchase system is required to validate the companion and body-doubling experience.

## 17. Delivery milestones and acceptance

### A. Reviewable browser mockup

- Apply the reference-led red-panda and warm-room visual direction.
- Demonstrate timer, pause/resume, reward rules, panda states, display modes, tutorial, study commitment, journal, and bookmark flows.
- Clearly distinguish working local behavior from social previews and future desktop functionality.
- Make flows usable at small screen sizes and by keyboard.

### B. Personal Godot companion

- Runnable Godot project with panda, reliable timer, native compact overlay, reminders, local journal, currency, commitment progress, and accessible controls.
- Closing/reopening preserves progress and does not duplicate rewards.
- Paused time earns nothing; early ending preserves base earnings; completing adds the bonus once.
- Missing days preserves challenge progress and completion-reward eligibility.
- Still and lightweight modes preserve all core functions.

### C. First social validation build

- Real invite-only presence, friends' pandas, optional synchronized timers, personal pause, agreed group pause, and trust-based in-person check-in.
- Reward overlap is measured correctly across joins, pauses, disconnects, and exits.
- No location collection or camera requirement.
- Validate whether friends' presence improves repeat study use; solo usability alone does not validate the body-doubling hypothesis.

### D. Customization and progression

- Spend saved currency on customization.
- Expand environments, wardrobe, and shared panda interactions based on use and feedback.

## 18. Open decisions

- Exact supported platforms and minimum device requirements.
- Minimum/maximum focus durations and detailed recovery behavior during sleep or shutdown.
- Final currency rounding, overlap eligibility thresholds, and challenge completion rewards.
- Day boundary/timezone policy and manual-study qualification for commitments.
- Room capacity, host privileges, invitation expiration, and group-pause agreement rules.
- Panda reactions versus text chat.
- Account provider, backend, synchronization, retention, and moderation approach.
- Final branding, mascot name, original production art, and asset licensing.

This document supersedes earlier provisional suggestions where they conflict. Draft prototype code predating this specification is not evidence that a feature has been implemented or accepted.

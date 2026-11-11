# CopyPanda interface guidelines

Updated November 11, 2026. Website implementation; native overlay layout is separate.

## Structure and rationale

The illustrated room and panda are the main view. A single header contains destinations (Notes, Goals, Calendar, Together), environment controls (Room, Sound), and app utilities (Shop/wallet, Menu). One session panel contains the current task and timer. Desktop places it in the lower-right empty area so setup does not cover the panda; phones reserve room space above the panel and put four study destinations in bottom navigation. On narrow phones (380px and below), Room and Sound move into Menu to preserve usable targets.

This is a functional reference-driven prototype, not a completed user study. The next design decision should follow observed hesitation in real sessions rather than another global color/corner change.

Reference lessons, interpreted from official published screens and documentation:
- [Spirit City](https://mooncubegames.com/home/spirit-city-lofi-sessions-press-kit/): repeat the same visual language across scene tools, customization and collections.
- [Session](https://www.stayinsession.com/learn/getting-started-with-session-pomodoro-app): design setup, focus, pause, completion and break as one connected flow.
- [Virtual Cottage 2](https://store.steampowered.com/app/2943180/Virtual_Cottage_2/): keep the environment central to the study experience.
- [Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/): expose secondary settings when needed.

## Session states

- Ready: choose Focus or Short break, set focus duration, enter an optional task, start. Show earnings and Save & leave.
- Running: collapse setup automatically; retain task, time, Pause, end-session control and a Session settings disclosure. Keep secondary tools available.
- Paused: keep the same panel position, explicitly label Paused, offer Resume. Timer does not accrue study credit.
- Settings during a session: expose current mode/duration and task; mode/duration cannot change mid-session. Existing task editing remains available while paused. Close settings returns to the compact panel.
- Complete: existing summary offers a voluntary five-minute break; demos award no currency or study credit.
- Break: show the break panda and explicit break state. Return to a ready focus timer after completion.

DOM order supports the setup flow; explicit grid rows preserve its reading order. `data-session-state` is derived from the timer, not independently persisted. `timer-expanded` is temporary disclosure state. Timer visibility is no longer tied to navigation.

## Visual rules

Use one local system sans font family. Timer digits use tabular numbers. Controls use 14–16px text, supporting copy 12–13px, inputs 16px. Larger text raises control/input sizes. Dark evergreen (#263c32) unifies persistent scene controls, with pale text (#f6f2e5), muted text (#c2cdbb), and one warm gold Start/Pause action. Dialogs use light paper for reading and forms. Use consistent thin borders, 4–5px controls, and 8–12px panel corners. Avoid nested cards around every control.

`web/interface.css` owns the active interface geometry, state presentation and shared dialog skin. Older styles still provide scene/feature foundations. Preserve room and panda layer registration; never move just the panda to solve a UI overlap.

## Responsive and accessibility checks

- Use 44px minimum primary hit areas and 48px Start/Pause controls; labels accompany navigation icons.
- On phones, reserve space for the entire panda/book; expanded settings can scroll. Short windows use document flow with a 320px room instead of shrinking the companion.
- Keep visible focus rings and accessible names when visual labels disappear. Escape restores focus to the visible Room/Sound trigger. Menu actions restore focus to Menu.
- Preserve reduced-motion, large-text, high-contrast, compact and lightweight modes.
- Check 320/390px phones, 768px tablet, 1440px desktop and short landscape windows. Browser viewport checks are not physical-device testing.

## Next usability review

Ask three people to start a study task, pause/resume, find yesterday's work, change rooms and equip an owned item. Record where they hesitate and whether the panda remains visible. No real participant testing has been conducted for this revision.

## Accessibility references

- [W3C target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)
- [W3C contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [GOV.UK typography](https://design-system.service.gov.uk/styles/type-scale/)

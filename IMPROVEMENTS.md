# CopyPanda improvement log

## November 8 2026

### Batch 1 Typography and controls

- Replaced inconsistent tiny interface type with a local system font stack and a shared type scale.
- Increased primary controls, menu rows, timer modes, close buttons, and month navigation targets.
- Added stronger keyboard focus rings and darker selected/primary colors.
- Reworked phone header spacing and bottom controls, including safe areas and scrollable expanded panels.
- Kept the existing artwork and desktop scene layout.
- Added DESIGN_GUIDELINES.md with source links and explicit small-calendar target limitations.

Validation: desktop and 390px phone visual review, touch-target measurements, expanded timer and calendar interactions. Further responsive checks are tracked in subsequent batches.

### Batch 2 Responsive and session flow repairs

- Short windows switch to document scrolling so navigation and timer actions remain reachable.
- Calendar month changes select a date within the displayed month and retain keyboard focus on the month control.
- Date labels use readable month names and identify today with aria-current.
- Replaced the misleading reset arrow with a stop icon; idle end controls are disabled.
- Break mode hides the unrelated study-task field and clearly identifies its fixed duration.
- Moved the returning bookmark away from the desktop navigation rail.
- Updated tutorial and bookmark wording to match the working room system and current button names.

# CopyPanda interface guidelines

Updated November 11, 2026. These conventions apply to the website. Native overlay changes require separate implementation and device checks.

## Typography

Use one locally available system UI font stack without rounded display styling or external font requests. Body text and form inputs use 16px at the default browser setting; navigation and tabs use 14px, dialog and primary actions 15px, supporting text 12–13px, and phone navigation labels 12px. The Larger text setting raises controls to 16px and inputs to 18px. Timer digits use the same family with tabular numbers to avoid horizontal movement.

Use off-white surfaces (#fafaf7), dark neutral ink (#272d29), thin neutral dividers, olive (#455d3d) for selection/leaves, and rust (#8c4937) for the primary timer action. Warm colors and painted texture belong primarily to the scene artwork. Primary actions are filled; secondary actions are outlined or transparent. Use 4–6px corners for panels and controls, without chunky offset shadows or nested pill boxes.

## Current interface layer

web/interface.css is the active visual skin, loaded after legacy scene/layout styles. It controls the timer, navigation, shared dialog skin, and shop gallery. Keep geometry changes scoped and preserve the scene/art registration rules. Shop tiles use artwork with names/prices below, without an enclosing button-card border. Tab selection is a restrained underline.

On screens up to 1024px, Room and Sound live in Menu and their floating toolbar is hidden. Below 600px, Account also moves into Menu so the header stays on one row. Opened panels receive focus; Escape returns to the visible trigger. Desktop keeps its room/sound toolbar and Account control.

## Interaction and responsive layout

- Aim for at least 44px by 44px interactive targets, with 48px primary actions and 56px phone navigation buttons. Icons can be visually smaller than their hit areas.
- The seven-column calendar uses narrower date cells on small phones to keep the whole week visible. Dates remain above the WCAG 24px minimum, with spacing; this is not a claim that every target meets the enhanced 44px criterion.
- Use a left study rail and right timer on larger screens. On phones, use bottom navigation and an expandable timer instead of scaling the desktop interface down.
- Keep secondary room/sound controls grouped, provide safe-area spacing, and allow expanded panels and dialogs to scroll.
- Keep a visible keyboard focus ring, native form semantics, readable placeholders, and labels alongside navigation icons.
- Preserve reduced-motion, large-text, high-contrast, and compact modes. Test them alongside normal layouts.
- Target at least 4.5:1 contrast for ordinary text. A visual review is not a complete WCAG conformance audit.

## Sources

- [W3C target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum): 24 CSS pixels, with defined exceptions.
- [W3C target size enhanced](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html): 44 CSS pixels, with defined exceptions.
- [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): ordinary text contrast of at least 4.5:1.
- [GOV.UK type scale](https://design-system.service.gov.uk/styles/type-scale/): consistent responsive type sizes, line heights, and relative units. CopyPanda uses its own visual identity and type scale.
- [Material typography](https://m3.material.io/styles/typography/applying-type): type roles and tabular numbers for changing numerical displays.

# CopyPanda interface guidelines

Updated November 8, 2026. These conventions apply to the website. Native overlay changes require separate implementation and device checks.

## Typography

Use one locally available rounded/system UI font stack, without external font requests. Body text and form inputs use 16px at the default browser setting, controls use 15px, supporting text uses 13px, and phone navigation labels use 12px. Use relative units so browser text settings remain effective. Timer digits use tabular numbers to avoid horizontal movement.

Keep the cozy cream, brown, olive, and rust palette. Primary actions use filled rust buttons; selected modes use olive; secondary actions use quiet outlined or transparent controls. Do not style every action as a primary action.

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

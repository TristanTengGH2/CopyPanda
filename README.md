# CopyPanda

A red-panda study companion with a browser mockup and a Windows Godot overlay alpha, based on [SPEC.md](SPEC.md).

Windows previews are available. A macOS Universal 2 implementation is now in progress; see [Mac build and device checks](MACOS_OVERLAY.md). See [the overlay specification](OVERLAY_SPEC.md) and [native source/build instructions](overlay/README.md). The website's **Get overlay** entry links to this repository and its releases. No native download is advertised as available until an actual build is published.

## Try it

Requires Node.js 18 or later. No npm packages, account, API key, or build step are needed.

```sh
npm start
```

Open `http://127.0.0.1:4173/`. Run the core checks with `npm test`.

The hosted browser app is maintained in [CopyPanda-web](https://github.com/TristanTengGH2/CopyPanda-web) and is live at [CopyPanda](https://tristantenggh2.github.io/CopyPanda-web/). Only that repository deploys GitHub Pages. The `web/` directory here is a retained prototype snapshot; pushes to this overlay repository do not deploy the website.

## Working local flows

- Adjustable focus timer, short breaks, pause/resume, and early ending.
- One leaf per full active minute, plus a 10% completion bonus rounded up. Paused time earns nothing. Ending early retains base earnings.
- A 10-second demo that awards no currency or study credit.
- A configurable daily commitment working toward 7, 14, or 30 study days. Gaps never reset challenge progress.
- Journal calendar, private notes, clearly distinguished manual study entries, and commitment keepsake badges.
- Optional exit bookmark and return-to-goal flow.
- Skippable, replayable tutorial.
- Original sound loops, room selection, compact panda-and-timer view, reduced motion, Still mode, larger text, and high contrast.
- The café panda turns a page of its existing book using six complete illustrated poses. Its arm stays connected throughout; there is no separate sliding paw or geometric paper overlay. The complete frames are shown without a fixed-book cutout. They have slight natural registration movement, but the rejected clipping mask and whole-character bob are removed. Page turns happen occasionally while idle/focusing, not during breaks. Click the panda to preview a page turn immediately. Pausing freezes automatic movement; reduced motion and Still mode disable it.

Data is stored in browser local storage. Closing/reloading preserves accrued session time in a paused state; the app does not award time while closed. A scheduling gap longer than 90 seconds pauses conservatively because it may represent device sleep. A new tab must be resumed explicitly. Browser background throttling varies by device, so production recovery needs further work.

Sessions are currently logged to the local day on which they end. Manually logged study adds history but no currency or commitment credit. Challenge completion currently grants a keepsake badge; its future currency bonus is intentionally undecided.

Use one active CopyPanda tab. Guest study rooms now connect through Supabase. Email sign-in and cross-device progress remain pending sender configuration; backup/export and account recovery are not yet released. Clearing browser site data deletes local progress. The `?qa=1` query uses a separate local test profile so QA does not change normal study records.

## Explicit previews and limitations

The **Together** dialog connects real guest rooms, creates expiring QR/link/code invitations, and offers optional shared starts and unanimous group pauses. QR generation and decoding stay on the device. No location is collected or proximity verified. Leaves/history currently stay local while email sign-in is pending; the server reward ledger is implemented and tested for the later account rollout. See [NETWORK_SPEC.md](NETWORK_SPEC.md) and [backend setup](backend/README.md).

The browser's compact layout is not an OS-level always-on-top overlay. The separate `overlay/` Godot alpha implements a native transparent window, timer, local progress, tray controls, and Windows session-event helper. Distinct focus/break poses and guest networking are implemented. Email accounts, shop, and payments remain pending milestones. Accessibility controls are implemented but have not been certified or fully tested with screen readers. Lightweight behavior is a design direction, not a measured minimum-hardware guarantee.

The café is the selected art direction: warm environment, flatter hand-drawn panda, and floating bubble controls over a full-screen room. It uses a cleaned background, a coherent character sprite sheet, and independent foreground plant, flowers, and mug. All layers share the same viewport transform. The extra table support was removed. Other rooms are simplified layout studies. The compact view uses a companion illustration derived from the scene panda. Character movement uses lightweight CSS transforms and a short illustrated frame sequence; smoother production animation remains future work.

## Files

- `web/` — buildless HTML/CSS/JS prototype and assets.
- `overlay/` — Windows Godot alpha, model/persistence checks, and portable build script.
- `web/core.js` — isolated timing, reward, and commitment logic.
- `tests/core.test.cjs` — meaningful core checks.
- `scripts/serve.cjs` — local preview server.
- `SPEC.md` — agreed product direction and open decisions.

See [asset notes](web/assets/ASSETS.md) for artwork provenance and generation prompts. Supplied reference images are not redistributed.

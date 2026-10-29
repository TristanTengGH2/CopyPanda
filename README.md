# CopyPanda

A red-panda study companion. This first browser mockup explores the experience defined in [SPEC.md](SPEC.md); Godot remains the intended native implementation engine.

## Try it

Requires Node.js 18 or later. No npm packages, account, API key, or build step are needed.

```sh
npm start
```

Open `http://127.0.0.1:4173/`. Run the core checks with `npm test`.

The `web/` directory is a self-contained static site and can be hosted on GitHub Pages. In repository Settings → Pages, choose **GitHub Actions** as the source. The included workflow publishes `web/` after pushes to `main`.

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

Use one active CopyPanda tab. Cross-tab coordination, data migration, cloud sync, backup/export, and account recovery are not implemented. Clearing browser site data deletes local progress. The `?qa=1` query uses a separate local test profile so QA does not change normal study records.

## Explicit previews and limitations

The **Together** dialog demonstrates independent versus synchronized sessions, personal versus agreed group pauses, and QR check-in. It does not connect users, generate valid room codes, verify proximity, synchronize real timers, or award social bonuses. No location is collected.

The browser's compact layout is not an OS-level always-on-top overlay. The native Godot app, production panda state animations, accounts, networking, shop, and payments are future milestones. Accessibility controls are implemented but have not been certified or fully tested with screen readers. Lightweight behavior is a design direction, not a measured minimum-hardware guarantee.

The café is the selected art direction: warm environment, flatter hand-drawn panda, and floating bubble controls over a full-screen room. It uses a cleaned background, a coherent character sprite sheet, and independent foreground plant, flowers, and mug. All layers share the same viewport transform. The extra table support was removed. Other rooms are simplified layout studies. The compact view uses a companion illustration derived from the scene panda. Character movement uses lightweight CSS transforms and a short illustrated frame sequence; smoother production animation remains future work.

## Files

- `web/` — buildless HTML/CSS/JS prototype and assets.
- `web/core.js` — isolated timing, reward, and commitment logic.
- `tests/core.test.cjs` — meaningful core checks.
- `scripts/serve.cjs` — local preview server.
- `.github/workflows/pages.yml` — GitHub Pages deployment.
- `SPEC.md` — agreed product direction and open decisions.

See [asset notes](web/assets/ASSETS.md) for artwork provenance and generation prompts. Supplied reference images are not redistributed.

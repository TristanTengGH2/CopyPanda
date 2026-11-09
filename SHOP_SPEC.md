# CopyPanda leaf shop and first-use tutorial

Status: website milestone, 2026-11-09. Native overlay binaries are unchanged.

## First catalogue

| Item | Slot | Price |
| --- | --- | --- |
| Rust beanie | Headwear | 40 leaves |
| Rainy library | Room | 120 leaves |
| Moonlit café | Room | 160 leaves |

Five starter sweater colors, no hat, and the four original rooms remain free. Prices are fixed in web/shop-core.js. Every purchase is permanent in this browser profile; changing or removing an owned item costs nothing. There is no real-money checkout, randomness, battle pass, or scarcity timer. Prices are an initial balance choice and can be revised only with a receipt migration for existing buyers.

Open Shop through the leaf balance or Menu. Clothing and Rooms tabs support arrow keys, Home, and End. Each item has a preview before an explicitly priced Buy & wear / Buy & use button. Insufficient funds, unavailable storage, or missing preview artwork prevents purchase. Ownership, balance, and a receipt are saved together before equipping. Storage conflicts keep the newer tab's saved data intact.

## Artwork and animation contract

The beanie is one transparent PNG, drawn into each of the six focus and six break frames at the reviewed head anchors in web/wardrobe-core.js. The source atlases remain unchanged. Runtime composition trims transparent margins, clips each atlas cell, applies the pose's head position/rotation, and prepares both output textures before switching. Existing book registration, animation timing, sweater masks, and reduced-motion behavior are reused. It performs no image work on every animation frame. Superseded textures and closed shop previews release their object URLs.

The low cap sits between the ears and leaves the face clear. Later hats must follow this head slot's canvas/occlusion constraints, or supply their own reviewed pose anchors. Different shirt silhouettes still need authored garment layers; this milestone is not a general skeletal clothing rig. See WARDROBE.md.

Each room plate is 1672×941 and retains the café's camera, foreground desk, and clear central placement area. Focus/page-turn and break/stretch use the same panda atlases and original tabletop coordinates in both new rooms. New plates need registration review before cataloguing.

## Persistence and backup safety

Purchases use local earned leaves only. Receipts contain id, itemId, fixed price, and purchasedAt. Backups include inventory, selected clothing and room. Restoring merges study IDs and item ownership; already owned items are not charged twice. Newly restored purchased items deduct their recorded spending from restored study earnings. Old pre-purchase backups cannot refund leaves. Conflicting offline spending that cannot be covered is rejected without changing the saved profile. Restoring private selections is optional; restoring purchase history is required to keep the wallet consistent. Older backups without these fields remain compatible.

Account inventory sync is pending, and email sign-in remains disabled pending an email provider. Future account checkout must be server-authoritative, transactional, and idempotent, with unique user/item ownership, validated earnings, receipt history, and an explicit local-to-account migration. Do not enable cloud checkout by merely removing the local-only UI guard. Browser storage is user-editable and is not an anti-cheat or payment ledger.

## Optional first-use tutorial

Offer a welcome on a new local profile: Show me around or Start studying. Four short steps explain the timer/pause, earned leaves, the shop/free items, and Calendar/Goals/Together/accessibility/bookmarks. Back, Next, Skip tutorial, Start studying, and Explore shop have direct labels. Escape/close also dismisses the welcome without nagging on reload. Menu → Tutorial and Settings → Replay the UI walkthrough remain available.

Account connection calls the same first-use offer when appropriate. A browser-level seen flag avoids repeating a guest tutorial after signup. Do not interrupt a running timer, invite join, or an unrelated open dialog. Numeric email signup itself cannot be tested until SMTP is configured.

## Mobile scene

On normal-height phones/tablets the scene occupies the area above the controls, with its image and sprite composition sharing one crop. A resize observer reserves the actual timer height. Expanded timer controls scroll within a bounded panel. Short phones (up to 600px wide and 680px high) use document scrolling with a separate 340px scene, so the panda does not shrink underneath the header. Desktop and native overlay framing are unaffected.

## Validation

33 automated tests cover rewards, inventory purchases, insufficient funds, receipt validation, duplicate restore, conflicting spend, backup compatibility, storage conflicts, and clothing masks. Browser checks used separate QA storage: a synthetic 330-leaf history bought all three items and left 10 leaves; reload retained ownership, and restoring the original history added zero leaves. Mobile checks cover 390×844 and 320×568, expanded timer, shop tabs/keyboard, and focus/break previews. Test records are excluded from production and repository commits. Native clothing and real account signup remain untested/unshipped in this milestone.

## Fit and testing follow-up (2026-11-09)

The beanie now spans the skull with a shallower cap and per-pose ear contours composited in front, rather than sitting as a small cap between the ears. Source PNGs are unchanged. The QR image picker is a real keyboard-accessible button that opens a hidden file input; its filename wraps on a separate status line.

For development testing, open the website with ?test-shop=1 and choose Shop → Add 500 test leaves. This is a single local credit per browser profile, recorded as shop-preview-v1, with no study record, streak progress, or account balance award. Its marker is included in backups; restoring it twice does not issue another credit. This remains a local preview facility, not a production economy guarantee.

## Distinct rooms and headwear revision (2026-11-09)

Added Sunlit greenhouse (180 leaves) and Hilltop observatory (200 leaves). These have different architecture, furniture, lighting and colors rather than variations of the café plate. Each room stores its own pandaTop tabletop anchor while sharing original focus/break texture atlases, animation timing and image crop geometry. Greenhouse artwork is 1671×941; Observatory is 1672×941. Intrinsic image dimensions remain authoritative. Original free rooms are unchanged.

The Rust beanie item ID, 40-leaf price, and prior ownership stay intact. Its new authored transparent layer has knitted ear pockets and a curved cuff, covers the original ears, and uses uniform scaling at the original aspect ratio. No ear polygon repainting remains. This is a fitted 2D accessory with per-pose attachment metadata, not a skeletal rig; future differently shaped garments still require authored layers and pose review.

Validation: 34 tests pass. Separate QA profile bought beanie + both new rooms for 420 of 500 test leaves, leaving 80. Reviewed desk contact in both rooms, focus/page-turn and break/stretch, reload persistence, mobile scene with collapsed/expanded timer, and paid-room preview. Native binaries are unchanged.

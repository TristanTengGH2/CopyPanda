# Panda cutout pipeline

Website implementation, 2026-11-09. This is a per-pose layered sprite pipeline for the existing twelve authored poses, not a free-moving skeleton. Native Godot binaries are unchanged.

## Source and draw order

The original focus and break atlases remain the authoritative character artwork. A source-ownership map in web/panda-rig-core.js assigns every visible source pixel to exactly one of five cutouts: body/tail/book base, face/expression, ears, foreground paw/sleeve/page, or rear sweater fabric. Existing connected sweater masks still determine recoloring, including foreground sleeves.

Composition order is body, rear sweater, face, cap crown, cap cuff, ears, foreground. The source face and ears are retained to preserve identity and all expressions; they are not replaced by the design-reference face in the new sheet. Every part shares a pose canvas and anchor; there is no independent generic hat resized over the finished illustration.

The coordinated panda-head-kit.png is an editable-source reference sheet with four raster components (head reference, ear reference, cap crown, cap cuff). The two clothing components are used by the renderer at authored crop rectangles and natural aspect ratios. The ears sit in front through real cutout ownership, rather than a second copy of the entire panda painted over a cap. The old cat-ear cap and vertical-squash code are no longer used.

A measured median orange-forehead landmark was 63–64 pixels from the top in Focus and 62–63 in Break. The previous guessed 8-degree stretch rotation and 12-pixel offset were discarded. The new per-pose placement follows those measured heights and keeps the real ears exposed.

## Runtime and resources

Textures are compiled once when the selected clothing changes. Existing CSS frame clocks, source dimensions, book registration and timing are reused. There is no new per-frame canvas loop. One-byte ownership maps are cached per atlas; a scratch buffer/canvas is reused across layers during compilation. Prepared atlas object URLs are disposed on replacement; modal previews are separately scoped. Original Moss/no-hat still uses the unprocessed original texture URLs. Reduced motion and hidden-page behavior remain in effect.

The beanie item ID and 40-leaf price remain compatible with existing receipts. Body and clothing shapes are still constrained to the twelve authored poses. Future different shirt silhouettes require authored garment/sleeve pieces, and a free-moving Godot cutout rig needs separate pivots, transforms and export work.

## Review tool

Open web/rig-preview.html (or the hosted /rig-preview.html). Toggle independent source layers, choose Focus/Break, step through each frame, play the existing animation, compare no-hat and beanie, and change sweater color. It does not read or change the user's wallet, notes, timer or wardrobe. It respects reduced motion and stops animation on page hiding.

## Free defaults

Shop → Rooms now explicitly lists the four Free starter rooms before paid themes. The original café has a free detail view and Use room action with no purchase path. Its free detail view shows no leaf amount, so the wallet cannot be mistaken for a price. Café, Library, Night train and My nook remain available at zero leaves; paid night/rain variations do not replace the free defaults.

## Validation

36 automated tests pass, including layer reconstruction/source alpha preservation and hidden-layer isolation. A read-only audit of both real source PNGs confirmed exact visible RGBA/alpha round trips across all twelve poses, with nonempty head/ear/foreground groups. Browser review covers raised paw/turning page, stretch pose, sweater sleeves, layer toggles, and selecting free rooms without reducing the wallet. The original source PNG hashes remain unchanged.

# CopyPanda clothing foundation

## Implemented first stage

Menu → Wardrobe offers five free starter sweater colors: Moss, River, Clay, Lavender, and Oat. The selected color is saved in this browser's local profile and can be included in a backup. No leaves are charged. Clothing is not yet synchronized through accounts or shared with other room members.

The website reuses the existing six-frame focus atlas and six-frame break atlas. The original files are unchanged. A connected fabric mask selects the sweater, including its moving sleeves, while excluding disconnected botanical illustrations in the book. Palette offsets preserve the painted texture and brown outlines. The mask and source pixels are kept separately from the chosen palette.

The renderer prepares both colored atlases before switching them together. The existing animation timing, frame positions, registration offsets, and background composition remain in control. There is no recoloring work on each animation frame. Only the current pair of output textures is retained; superseded blob URLs are released. Masks and original pixel data are cached for subsequent color changes.

The same selected texture is used for the Café scene panda, wardrobe preview, compact companion, lightweight/still companion, local room-member avatar, and local dialog portraits. Other people's room avatars retain their own default artwork. The wardrobe has a page-turn/stretch preview and respects reduced motion.

## Files and artwork contract

- `web/wardrobe-core.js`: palette definitions, per-pose fabric seed regions, connected masks, and color conversion.
- `web/wardrobe-renderer.js`: lazy texture preparation, cancellation of outdated choices, and CSS texture variables.
- `web/wardrobe.css`: shared texture bindings and accessible wardrobe controls.
- `web/assets/wardrobe-mask-contract.json`: source dimensions, atlas layout, reviewed source hashes, and mask coverage in all twelve poses.
- `tests/wardrobe.test.cjs`: palette safety, source/alpha preservation, disconnected-leaf exclusion, and the reviewed artwork contract.

When changing either source atlas, review every pose and update the mask contract. These masks are calibrated to the existing olive sweater and these particular atlases; they are not a general clothing detector. A different garment shape needs an authored mask or clothing layer. The native overlay currently uses different artwork and must not reuse these coordinates without a separate review.

## Future garment layers and Godot rig

This release implements recolors, not a full cutout rig. For different garment shapes, prepare a consistent character source with separate torso, head, tail, upper/lower arms, paws, and clothing pieces. Keep fixed pivots and an agreed pose canvas. Keep the stationary book separate from moving page/paw layers.

Use clothing slots such as torso, left sleeve, right sleeve, and head accessory. Attach each sleeve to the same arm transform as its corresponding limb. Define front/back ordering explicitly so paws remain in front of sleeves and headwear can pass behind ears. A new outfit supplies compatible pieces for those slots while reusing the animations.

In Godot, these parts can be separate Sprite2D nodes animated with AnimationPlayer, or a Skeleton2D cutout rig where appropriate. Recolors can use a fabric mask and a CanvasItem shader. The website and native overlay should share palette IDs and garment metadata; their renderer implementations need not be identical. Neither new native binaries nor a skeleton rig are included in this website update.

References: [Godot cutout animation](https://docs.godotengine.org/en/stable/tutorials/animation/cutout_animation.html), [Godot sprite animation](https://docs.godotengine.org/en/stable/tutorials/2d/2d_sprite_animation.html).

## Validation

All twelve original poses have a nonempty sweater mask. The raw pixel conversion preserves source alpha and leaves every unmasked pixel unchanged; the original atlas files are never overwritten. Visual checks cover the main panda, break mode, palette changes, persistence, a 320px phone layout, and reduced-motion/lightweight behavior. Browser canvas decoding can introduce normal subpixel color rounding; geometry and animation registration are preserved.

## Headwear and leaf shop (2026-11-09)

The website now adds a Rust beanie as a separate headwear slot, composited at six pose-specific anchors per mode. Both headwear and sweater color are saved together. Five starter colors remain free. See [SHOP_SPEC.md](SHOP_SPEC.md) for catalogue prices, room assets, tutorial, backup rules, and native/account limitations.

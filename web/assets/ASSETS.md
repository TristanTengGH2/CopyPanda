# Prototype assets

The user supplied a ZIP of red-panda illustrations and warm miniature-room images as visual references. Those source images are not included in this repository and are not assumed to be licensed for shipping.

## Selected artwork

`cafe-flat-panda.png` was created with the built-in image-generation tool. The user selected the first flatter-panda revision. The original warm café background was preserved and its rendered panda was replaced with a flatter hand-drawn character. `panda-matched.png` is a transparent companion derived from that scene with the same tool after the user requested consistent panda styling. It is a prototype, not a production sprite sheet. The earlier round-eyed standalone mascot was rejected and is not used.

Both final files are saved in this directory, rather than referenced from the generator's private storage. The original generated files are preserved outside the repository.

### Café revision prompt

Use case: precise-object-edit. Image 1 is the edit target. Image 2 is style reference only, not to copy. Keep the entire warm cafe background, framing, desk, book, lighting, colors and all objects of image 1 unchanged. Replace ONLY its furry photorealistic 3D red panda with a clearly flat hand-drawn 2D red panda character, sitting in the same position studying the book. The new panda has rough chunky imperfect shapes, an oversized squarish head, tiny dark bean eyes, cream cheek patches, rust orange flat color, dark brown little arms and ringed tail, slightly irregular dark brown outline with a little dry brush texture. Very restrained flat shadow, no 3D fur, no gloss, no plush toy rendering. The character should feel like a simple charming illustrated sticker inhabiting the detailed warm room, with a contact shadow to ground it. Original character, not an exact copy of the reference. No text or watermark.

### Superseded companion prompt (not used)

Use case: illustration-story. Asset type: transparent desktop study companion mascot for CopyPanda. Create ONE original red panda sitting at a very simple low wooden desk with an open cream book, full body and fluffy curled striped tail visible. Clearly flat hand-drawn 2D illustration. Rough chunky slightly asymmetric shapes, oversized broad squarish head, tiny dark bean eyes, cream cheek patches and ear tips, muted rust orange body, dark chocolate little arms and feet. Expressive, calm, focused. Slightly imperfect dark brown dry-brush outline. Restrained flat color and only one flat shadow tone, like an indie hand-painted sticker. No detailed fur, no 3D, no rendered volume, no glossy highlights, no gradients, not pixel art, not slick vector icon art. Desk is minimal and secondary to character. Generous transparent padding, centered composition. No text, no watermark, no other objects. Actual transparent background.

## Other assets

### Selected matching companion prompt

Use case: background-extraction. Edit the provided image to make a transparent character asset. Extract and preserve EXACTLY the flat hand-drawn red panda sitting at the book in the center of this image: identical wide squarish orange head, flat little horizontal bean eyes with calm sleepy expression, small dark triangular nose, tiny mouth, cream cheek patches, pointed cream-tipped ears, rough brown dry-brush outlines, dark hands, muted sage sweater, striped tail on its right. Keep its original character proportions and artistic identity unchanged. Include only this panda, its two hands, striped tail and the open book in front of it, with a small simple sliver of desk beneath the book. Remove the entire cafe and all background objects to true transparency. Do not redraw it as the round wide-eyed mascot from the other assets; it must have the same calm horizontal eyes and blocky shape as the provided scene panda. No 3D fur, no gloss, no extra lighting, no text, no watermark. Centered with transparent padding.

The simplified SVG room studies and initial small SVG panda mark were drawn in code for this prototype. The two WAV loops are original synthesized piano chords and filtered noise, generated for this project. They contain no external recordings. Typography uses local system fonts; no remote font request or third-party runtime is required.

The static café image is about 2.3 MB and the transparent companion about 1.9 MB. Production assets need compression, consistent character art, and hardware measurements. Lightweight/Still modes do not reference the café background after initialization.

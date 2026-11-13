# Design

A monochrome cockpit. The interface earns its sci-fi feel from instrument precision and light in a real volume, not from coloured neon.

## Direction

The interface is light on glass, looking out into a volume. Three depths, always in this order:

- **Space:** `Starfield` in WebGL2. Nebula, stars, a lit planet limb and warp. It sits behind everything and carries the mood.
- **Glass:** emissive linework and type on translucent panels. `Cockpit` and `Wing` angle the side consoles in around the player and lean them towards the pointer.
- **Volume:** objects that exist in 3D rather than on the page. `TacticalVolume` is a stalk radar, and `Hologram` turns a wireframe hull through a scan plane.

A surface is lit, never printed. Structure stays dark, and only what is emitting data carries bloom through `--mh-glow`. The state of the ship reaches the whole display: `alert` tints the frame lines and the screen edge instead of any one component, and `.mh-screen` lays scan texture and lens falloff over everything.

## Colour

- **Default is monochrome:** every surface, line and text colour has zero chroma, so nothing leans blue or warm.
- **Ground:** four neutral steps from `--mh-bg-0` to `--mh-bg-3`.
- **Lines:** `--mh-line` and `--mh-line-strong`.
- **Signal:** the default `mono` theme uses white as `--mh-accent`. State must also read through fill, brackets and marks, never through hue alone.
- **Status colour:** the only colour in the default theme. `ok` is green, `warn` is orange, `danger` is red. `info` stays neutral.
- **Optional themes:** `sodium`, `ion` and `ember` replace the accent only, and developers opt in with the `theme` prop.

## Type

- **Typeface:** Geist Mono for headings, body and data.
- **Hierarchy:** comes from size, weight and spacing, since every role shares one face.
- **Tokens:** `--mh-font-display`, `--mh-font-body` and `--mh-font-data` stay separate so a developer can override one role.

## Shape

- **Chamfers:** top-left and bottom-right by default. `.mh-cut` paints edge and fill with two pseudo-elements and never clips the element itself.
- **Chamfer scale:** one size per kind of surface, so neighbours match. Buttons, inputs and selects cut 5px, large buttons 7px, and panels and overlays use the larger tokens. Never scale a control's cut with its height.
- **Nested chamfers:** a shape inset by `d` inside a chamfer of `c` cuts `c - 0.586d`, which keeps the gap even along the diagonal.
- **Fills must be opaque:** the fill sits on the edge layer, so a translucent fill shows the edge colour through. Use `color-mix` with the ground colour for a tinted look.
- **Large surfaces:** use `Frame`, an SVG outline drawn to the measured size, with notches and a line-draw entrance.
- **State marks:** always diamonds. Radios are diamonds too, which separates them from square checkboxes. The switch is the exception: a bar for on and a ring for off, read as 1 and 0.
- **Quantity bars:** segmented cells, taken from ammo and shield readouts. A fixed count fills smoothly through its cells. `auto` fits cells to the width and counts in whole cells, like rounds left in a magazine.

## Detail

Density comes from four layers, finest to strongest, so the eye reads structure first and data second:

- **Etching:** inner rules, edge rulers, hatch strips and registration crosses, in `--mh-line` at low opacity.
- **Graduation:** every scale is numbered. Bars and sliders carry tick marks and values; `Radar` and `Gauge` read like instruments.
- **Micro-labels:** `.mh-micro` at 11px in `--mh-fg-faint`. They must carry real data, never decorative filler.
- **Content:** values and controls at full contrast.

`MonohudProvider detail="minimal"` removes the etching and micro-labels for dense layouts or small screens.

## Motion

- **Lock-on brackets:** the kit's signature. `.mh-lock` waits outside a control and snaps on for hover and keyboard focus, and doubles as the focus ring.
- **Entrance:** the outline draws first, then content fades in.
- **Dialog:** opens like a display powering up, a bright line first and then full height.
- **Levels:** `data-mh-motion` is `off`, `subtle` or `full`, and `prefers-reduced-motion` always wins.
- **Distortion:** `MonohudProvider distortion` takes 0 to 1 and defaults to 0.15; 0 adds no filter at all. A signal fault, not a wobble: most rows stay put, a few slip sideways, and a brief stronger tear arrives every few seconds. Below 0.35 the picture rests clean and the filter only runs during those tears, so text stays sharp and the idle frame costs nothing. The echo copies the picture instead of splitting RGB, so the monochrome theme stays hue-free. `full` flickers and tears, `subtle` holds still between softer tears, and `off` holds one still frame. Raise it from game state for moments such as taking damage.
- **Authored moments:** the demo's jump is the model. Charge stretches the stars and warms the alert, engagement flashes white and folds the consoles away, and arrival flashes again as the panels redraw and a planet rises. Spend one moment per flow; everything else stays quiet.

## Sound

Synthesised with WebAudio and off by default. `MonohudProvider` uses event delegation, so controls need no wiring. `data-mh-bleep` overrides the sound for one control.

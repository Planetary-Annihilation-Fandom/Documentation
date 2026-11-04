# Effects

Planetary Annihilation particle effects use JSON files with the `.pfx` extension. Their
emitters define particle spawning, and each emitter's `spec` defines rendering and appearance.

- [Particle systems](Particle%20System.md) documents the `.pfx` structure, emitter and
  particle properties, curves, shaders, colors, beams, and mesh particles.
- [Unit properties](../Entities/Units/Basics.md#effects-and-sounds) describes effects
  triggered by unit events and persistent effects attached to units.
- [Unit animation](../Entities/Units/Animation.md) shows how animation events trigger effects
  at a specified time and bone.

The Review tool also validates `.pfx` files against the vocabulary used by the shipped game.
Its [base-game key snapshot](../Review/references/pfx-keys.json) supplements the format
described here because the game includes keys and emitter types not covered by the general
reference.

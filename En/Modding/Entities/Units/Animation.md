# Unit Animation

**Blend Root, "blend_root":** – All units will have a "blend_root" node.

"unit_state": – as it sounds, the state the unit is in
- "being_built" – defines what the unit will do when being built
- "living" – defines what the unit will do after construction is complete/living
- "dead" – defines what the unit will do when dead
- "ghost" – defines what the unit will look like when it's build outline is shown. CURRENTLY BROKEN AND WILL ALWAYS USE BIND STATE.

"type": – defines the type of operation to use
- "playback" – plays animation, defined by "anim_name"
- "toggle" – used to toggle between two different "func" states using nodes ("node_0" and "node_1").
- "item"
- "bind_pose" – will use the pose of the unit .papa model.
- "sequence" – used to create a sequence of animations.
- "aim_blend" – uses premade animations to determine min/max pitch. Nearly always will lead to aim looking wrong due to barrel pitch not aligning to projectiles fired. May also reduce effective firing range depending on angle set in aimUp/aimDown animations.
- "walk" – similar to the toggle operation where it toggles between states, but uses different nodes ("node_idle" and "node_walk").
- "fly" – similar to the toggle and walk operations where it toggles between states, but uses different nodes ("node_idle" and "node_fly").
- "slotted_build_target" used to position build items, used by anti-nuke for example.

Examples:

A typical node setup for the "playback" operation. In this case it is saying for the unit when being build to use the animation "idle" on repeat/looping.

```json
{
    "being_built": {
        "type": "playback",
        "looping": true,
        "anim_name": "idle"
    }
}
```
A simple node setup for the "toggle" operation. Here it states that when the unit is living if it has energy it will be in "node_0" state and therefore use the "idle" animation. If the unit does not have energy it will be in "node_1" state and use it's bind pose. These toggle operations can actually be a lot more complex and use sequences, for an example look at the "missile_launcher_anim_tree.json".

```json
{
    "living": {
        "type": "toggle",
        "func": "has_energy",
        "node_0": {
            "type": "playback",
            "anim_name": "idle"
        },
        "node_1": {
            "type": "bind_pose"
        }
    }
}
```
A simple "walk" operation node setup. For a more complex node setup look at the "titan_bot_anim_tree.json".

```json
{
    "living": {
        "type": "walk",
        "node_idle": {
            "type": "playback",
            "anim_name": "idle"
        },
        "node_walk": {
            "type": "playback",
            "anim_name": "walk"
        }
    }
}
```
A simple "aim_blend" operation. I've incorporated the entire blend root node to make it clearer.

```json
{
    "blend_root": {
        "type": "aim_blend",
        "aim_bone_root": "bone_turret",
        "node_aim_down": {
            "type": "bind_pose"
        },
        "node_aim_neutral": {
            "type": "bind_pose"
        },
        "node_aim_up": {
            "type": "playback",
            "anim_name": "aim_up"
        },
        "child": {
            "type": "bind_pose"
        }
    }
}
```
**Transitions, "transitions":**

Used to define functions and target animations when going forward or backward in an animation tree. Typically used in type "sequence" operations.

"transition_forward": used to transition forward in an animation tree.

"transition_reverse": used to transition reverse in an animation tree. Essentially always set it to the previous node/anim. May be used when in watching in reverse in chrono cam.

"transition_seek": used by chronocam, as the unit will in a state where the game doesn't know what state it should be

"func": – true or false procedures/checks on functions (listed below)
- "anim_complete" – animation is complete
- "has_build_target" – unit is being ordered to build
- "no_build_target" – unit has no build order
- "no_build_target_and_anim_complete" – unit has no build order and animation is complete
- "has_energy" – unit has energy
- "no_energy_and_anim_complete" – unit has no energy and current animation is complete
- "is_firing" – unit is firing
- "is_attached" – unit is attached
- "not_attached" – unit is not attached
- "is_moving" – unit is moving
- "not_moving" – unit is not moving
- "true_func" – means will return true, practically it means always execute the transition
- "false_func" – means will return false, practically it means never execute the transition

Examples:

A typical node setup that uses a sequence operation and transitions. This example is the build loop node from the factory animation tree, and states it will play the "build_loop" animation on repeat (looping) and will not transition into another animation until there is "no_build_target", i.e. construction is completed or cancelled, where it will begin the "build_end" animation.

```json
{
    "type": "sequence_entry",
    "name": "build_loop",
    "node": {
        "type": "playback",

            "anim_name": "build_loop",
        "looping": true
    },
    "transitions": [
        {

                "transition_forward": {
                "func": "no_build_target",
                "target": "build_end"
            },

                "transition_reverse": {
                "func": "no_build_target",
                "target": "build_start"
            }
        }
    ],
    "reset": "playback_reset"
}
```
A typical transition seek node setup. In this case it's asking does the unit have a build target, if true jump to the "build_loop" node/animation, and if not then jump to the "idle" node/animation.

```json
{
    "transition_seek": {
        "func": "has_build_target",
        "true_target": "build_loop",
        "false_target": "idle"
    }
}
```
**Skelton Controls, "skeleton_controls":** – Units with turrets will use this node.

"type" – operations typically used only in skeleton control
- "fader" – used to fade between anim states. Typically used with "lerp_func" and "procedural"_aim.
- "procedural_aim" – uses engine to aim using bones, commonly used for turrets, and uses the field "rotation_bone" where you attribute bones to x (pitch) and z (yaw) rotation.
- "recoil" – used for giving recoil to weapons, used in combination with "bone", "recoil_dist", and "restore_time". Typically only used in the skeleton control section.

"func": – functions typically only used in skeleton control
- "lerp_func": – literally meaning linear interpolation. Can use the same fields as listed under "func". Used to detail whether a defined child node should operate or not.

Examples:

Typical node entry that uses the fader operation match with the lerp_func.

```json
{
    "type": "fader",

    "lerp_func": "is_active",
    "child": {
        "type": "procedural_aim",

        "rotation_bone": "bone_turret",

        "rotation_axis": "z"
    }
}
```
Typical node entry that uses procedural aim (in this case yaw [Z axis]) to control turret rotations.

```json
{
    "type": "procedural_aim",

    "rotation_bone": "bone_turret",

    "rotation_axis": "z"
}
```
Typical node entry for recoil

```json
{
    "type": "recoil",
    "bone": "bone_recoil",

    "recoil_dist": 1.1,

    "restore_time": 1.0
}
```
**Effects (.pfx) and audio in animation trees**

For the `.pfx` file format and particle properties, see [Particle systems](../../Effects/Particle%20System.md).

It is also possible to add effects and audio in anim trees. As this uses a combination of many operations and functions I will use an example to explain.

This example is from the "titan_bot_anim_tree.json", I have not included the entirety of this sequence or the transitions. Here we can see that when the unit is walking it will scale to the move speed and use the animation "walk" which will loop/repeat. You can use the "events" node to time certain audio and effects. You can see the node setup below.

```json
{
    "type": "item",
    "name": "walking",

    "scale_to_move_speed": true,
    "node": {
        "type": "playback",

        "anim_name": "walk",
        "looping": true,
        "events": [
            {
                "time": 1.33,
                "type": "audio",
                "parameters": {
                    "cue": "/SE/Movement/titan/bot_step_big"
                }
            },
            {
                "time": 2.833,
                "type": "audio",
                "parameters": {
                    "cue": "/SE/Movement/titan/bot_step_big"
                }
            },
            {
                "time": 2.833,
                "type": "effect",
                "parameters": {
                    "bone": "bone_RLeg1Knee",
                    "spec": "/pa/units/land/titan_bot/titan_bot_footstep_01.pfx",

                    "effect_scale": 1.0,

                    "bone_offset": [
                        15.36,
                        1.1,
                        0.0
                    ]
                }
            }
        ]
    }
}

```

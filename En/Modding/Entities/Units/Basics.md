## General

The logic and properties of each unit are described in the main json file. The unit file is defined by fields with values specific only to the unit. In addition, this file in the overwhelming case has a name corresponding to the in-game name of the unit, although this is an optional condition.

## Fields
>
> Next, the main fields defining the unit will be given, with examples.

### Basic Unit

    "base_spec":"/pa/units/land/base_bot/base_bot.json"    
In most cases, the basic properties of units do not differ from each other, for example, the type of armor, display settings, tags and a set of control commands. In order not to prescribe the same fields in each new unit, the game engine is able to determine the base unit. Fields can be redefined by entering new values for them other than the base values; it is enough to add the desired field to the new unit and the value for it. Thus, the fields of the base unit are taken as a basis, if these fields are not defined in the new unit.

### Interface

#### Display name

     "display_name": "Base Bot"

#### In-game description

    "description": "Base Bot Description"

#### Priority of displaying

    "strategic_icon_priority": 3
The higher the value, the higher the priority. The icon with a higher priority will be displayed on top of the icons with a lower priority.

### Gameplay

#### Amount of health

    "max_health": 1

#### Cost

    "build_metal_cost": 1
The amount of metal required to create a unit.

#### Radius of aggression

    "guard_radius": 50
In this radius, the unit will react aggressively to enemy entities. If the unit has a weapon with a large radius, the value of the radius of use of this weapon will be used instead of *"guard_radius"*.

#### Aggression layer

    "guard_layer": "WL_AnySurface"
The aggression layer determines among which terrain enemy units will be searched. The list of layers is presented in (link to world layers)

#### Goal update frequency

    "nearby_target_tick_update_interval": 5
The field determines how often the search for targets near the unit will be performed. There are 10 ticks in one second. Accordingly, in the example above, the search frequency will be equal to 0.5 seconds.

#### Destruction

    "atrophy_rate": 200.0
    "atrophy_cool_down": 15.0
When the frame of a unit, during construction, ceases to receive metal, no one builds it, then after a while the destruction process starts, gradually destroying the unfinished frame.

The frame has health calculated in the amount of metal, where the maximum value is equal to the unit cost. The first field is responsible for how much metal will decrease at resolution. The second field is for the timer of the beginning of destruction, after the last receipt of the metal.

#### Wreckage

The debris remaining after the destruction of the unit has health and metal inside them.

    "wreckage_health_frac": 0.7
This number determines the amount of health and metal in the wreckage. It is multiplied by *max_health* and *build_metal_cost*.
The game engine uses these formulas to calculate the characteristics of the wreckage:
> wreckage_metal = (wreckage_health_frac / (1 + wreckage_health_frac)) *
> build_metal_cost
>
The amount of metal at the value of *wreckage_health_frac* = 1.0 will be equal to half the cost of the unit, and 0.0 will leave neither health nor metal in the wreckage.  
> wreckage_health = wreckage_health_frac * max_health

#### Wreckage physics

    "wreckage": {
        "remove_ground_cost_stamp": true,
        "collision": ["none"]
    }
Debris can affect unit path finding and some physical interactions. There is no complete information on setting up this mechanics at the moment, but the above example is used in the wreckage of units, removing physics and influence on the path search. The standard value used if you do not enter the wreckage field is the same as for buildings. In the basic definitions of units, everything is already set up so that the debris is through and does not affect the path search.

Values that can be used in ***collisions***: none, mobile, projectile, structure, all.
The ***remove_ground_cost_stamp*** parameter has an impact on the path search. If it is true, it does not affect the path search.

#### Wreckage hitbox

    "wreckage_mesh_bounds": [14,14, 22.5]
This field determines the size of the wreckage hitbox. When projectiles hit the wreckage, it will take damage and disappear in the absence of health.

#### Unit type

    "unit_types": [
        "UNITTYPE_Bot","UNITTYPE_Mobile","UNITTYPE_Land","UNITTYPE_NoBuild"
    ]
A unit can be added a certain type to which it belongs. Unit types are used to prioritize targets, units under construction, AI behavior, armor types, and some hard-coded actions.

A combination of unit types is often used to limit what a unit can build.

The only hard-coded behaviors that are known are the attack of a nuclear bomb and the targeting of orbital units.

fabOrbBuildable may be required in order for a unit to be built in factories, but it's just worth enabling it so that the AI can use it and the unit makes more sense to the AI.

The values used have the format UNITTYPE_NAME, where NAME is a hard-coded type.

List of types in a simplified format:
> Commander, SupportCommander, Fabber, Debug, Tank, Bot, Bomber,
> Fighter, Gunship, Transport, Teleporter, Scout, Structure, Mobile,
> Hover, Wall, Sub, Nuke, NukeDefense, Heavy, Artillery, SelfDestruct,
> Tactical, MissileDefense, LaserPlatform, AirFabOrbBuildDefense,
> SurfaceDefense, OrbitalDefense, ControlModule, PlanetEngine,
> CannonBuildable, Titan, MetalProduction, EnergyProduction,
> Construction, Deconstruction, Land, Naval, Air, Orbital, Basic,
> Advanced, CmdBuild, FabBuild, FabAdvBuild, FabOrbBuild, FactoryBuild,
> CombatFabBuild, CombatFabAdvBuild, Economy, Factory, Defense, Offense,
> Recon, NoBuild, Important, Radar, RadarJammer, Custom1, Custom2, Custom3, Custom4

#### Armor type

    "armor_type": "AT_Bot"
Armor types are used as a way to modify damage against certain types of units, for most units they are defined in the base file. The type of armor is needed not so much for the unit, but for various weapons, in which the damage is determined by entities.

Armor Types:
> AT_Commander, AT_Orbital, AT_Air, AT_Bot, AT_Vehicle, AT_Hover,
> AT_Naval

#### Spawn layer

    "spawn_layer": "WL_Orbital"
The appearance layer allows construction units to create a given unit on a certain type of surface. Orbiting Titan is a great example.

#### Hitbox size

    "mesh_bounds": [ 6.5,7,7.6 ]
The *mesh_bounds* field defines the volume area in which the unit will take damage and react to pushing other units.

#### Death behavior

    "death_weapon": {
        "ground_ammo_spec": "/pa/ammo/nuke_pbaoe/nuke_pbaoe.json",
        "air_ammo_spec": "/pa/ammo/nuke_pbaoe/nuke_pbaoe_air.json",
    }
This field defines the weapon used in death. For the land and sea of the planet, weapons are indicated in the *ground_ammo_spec* field, and for air and orbit in *air_ammo_spec*.

Weapons can not only deal damage, but also create units and/or buildings.

#### Commands

    "command_caps" orders: [
        "ORDER_Move", "ORDER_Patrol", "ORDER_Attack", "ORDER_Assist", "ORDER_Use"
    ]
The orders displayed on the user interface and available for use are defined in the *command_caps* list.

List of orders:
> Move, SpecialMove, Patrol, Build, FactoryBuild, Attack, AttackMove,
> Reclaim, Repair, Assist, Use, Load, Unload, FireSecondaryWeapon, Ping,
> MassTeleport, MaxValue

#### Dependence on energy

    "energy_efficiency_requirement": 0.9
If the unit has vision methods, interference generators, or the ability to teleport, then all this can be limited in use when the player's energy efficiency falls below a certain threshold. The example shows a threshold of "at least 90%".

#### Production

    "production": {
        "energy": 2000,
        "metal": 20
    }
The *production* field determines the number of resources produced. It is optional. Also its internal fields are optional. You can specify both energy and metal.

#### Storage

    "storage": {
        "energy": 45000,
        "metal": 1500
    }
The *storage* field determines the number of resources stored by the unit. It is optional. Also its internal fields are optional. You can specify both energy and metal.

#### Navigation

    "navigation": { ... }
The navigation field with all the properties inside determines the unit's movement method and movement characteristics. You can read more about all the properties in (link to navigation)

#### Physics

(I still don't understand how it all works here)

#### Vision

    "recon" : { ... }
The field of view/intelligence with all the properties inside determines what the unit sees and who sees the unit itself.
(link to vision)

#### Adaptations

The unit's tools field defines all the fixtures used, including weapons and construction cannons.

For more details, you can see the description in (add a link).

#### Building selection

    "buildable_types": "Land & Structure & Advanced - Factory| Factory & Advanced & Bot & Land | FabAdvBuild | FabBuild | Titan & Bot"
This field defines the entities that a unit can build. It is impossible to designate a specific entity, but you can use exclusive and unifying combinations of types to limit or expand the list of entities for construction.

Syntax: "&" - clarifying(and)(must have type), "-" - excluding (not) (must not have type), "|" - unifying(or)(also add to the list).

The example above indicates the following:
A unit can build anything that has

1. Types of Land and Structure and Advanced and does not have a Factory.
2. Next comes the symbol "|", combining the first condition with the following. I.e. entities from the first condition and subsequent ones will be available.
3. The following condition requires the presence of type Factory and Advanced and Bot and Land. Thus, an advanced bot factory is added.
4. Next come the FabAdvBuild + FabBuild + Titan & Bot types. The last expression says that it is possible to build an entity of the Titan type, which should be of the Bot type.

The first and second conditions contain Factory, but in the first condition it is removed, and in the second it is added. This is done in order to select all advanced entities, i.e. essentially all advanced ground structures. But in the game, bots, and the example is taken from an advanced bot builder, should not be able to build advanced tank and air factories. For this reason, factories are excluded in the first expression, so as not to add factories of planes and tanks. In the second expression, on the contrary, only the advanced factory is added.

### Graphics

#### Model and Animations

```json
"model": {
    "filename": "/pa/units/sea/naval_factory_adv/naval_factory_adv.papa",
    "animations": {
        "build_start":"/pa/units/sea/naval_factory_adv/naval_factory_adv_anim_start.papa",
        "build_loop": "/pa/units/sea/naval_factory_adv/naval_factory_adv_anim_build.papa",
        "build_end": "/pa/units/sea/naval_factory_adv/naval_factory_adv_anim_end.papa"
    },
    "animtree": "/pa/anim/anim_trees/factory_anim_tree.json",
    "walk_speed": 20
}
```

The *filename* field determines which path the unit model is located on.

The *animations* field defines the animations used by the unit: name and path.

The *animtree* field defines the path to the animation tree, a special file that explains to the game engine how these animations should be played. It also determines the rotations of towers and turrets.

The *walkspeed* field determines the speed of animation playback when walking. Does not affect the actual speed of movement.

#### Model mounts

```json
"attachable": {
    "default_attach_bone": "someBone",
    "offsets": {
        "root": [0,0,0],
        "head": [0,0,3.6]
    }
}
```

This field contains subfields for determining the attachment points relative to the model, or rather the base bone. These mounts are used by transporters and capsules to move and grab units.

    "default_attach_bone": "someBone"

This field overrides the standard bone relative to which the fasteners will be located. If you do not add this field, then a regular bone will be used.

#### Lods

    "lod_hide_pixelsize":32
(Need to test the effect on the display of units)

#### Rendering in orbit

    "show_in_orbital_layer": true
This field determines whether the unit model will be displayed when the camera is in orbit.

#### Texture of death

    "death": {
        "decals": [
            "/pa/effects/specs/scorch_a_01.json"
        ]
    }
A decal is a texture displayed on a surface. The decal after the death of the unit will be displayed on the surface of the planet.

#### Lamps

```json
"lamps": [
    {
        "offset": [0.0,3.68,5.53],
        "radius": 3.0,
        "color": [1.0,1.0,1.0],
        "intensity": 2.0,
        "bone": "head"
    },
    {...},
    {...}
]
```

The *lamps* field defines the list of lights.

Lanterns are light sources. They have their own color - *color*, radius *radius* glow and intensity *intensity*. The *offset* parameter is responsible for the location relative to the 3D model.

The *bone* field determines which bone the lantern will be positioned relative to. You don't need to add this field. If there is no field, then the lantern will be relative to the root bone of the model or just at the base of the model.

#### Headlights

```json
"headlights": [
    {
        "gobo": "/pa/effects/textures/gobo/spotlight_gobo.papa",
        "offset": [0.0,-0.7,0.0],
        "orientation": [0.0,35.0,0.0],
        "near_width": 1.5,
        "near_height": 1.5,
        "near_distance": 1.0,
        "far_distance": 20.0,
        "color": [0.75,1.0,1.0],
        "intensity": 1.4,
        "bone": "head"
    },
    {...},
    {...}
]
```

The *headlights* field defines the list of headlights.

*gobo* - the texture of the headlights. *offset* - location relative to the specified or standard bone. *orientation* - where the headlights are turned. *near_width* - the width of the light. *near_distance* - the distance from the glow point at which the light from the headlight begins to appear. *far_distance* - the distance at which the light ends. *color* - the color of the glow. *instensity* - light intensity. *bone* - the bone in which the headlight should be located.  

Several headlights can be identified.

#### Effects and sounds

```json
"events": {
    "fired": {
        "audio_cue": "/SE/Weapons/base/base_fire_laser"
        "effect_spec": "/pa/effects/specs/default_muzzle_flash.pfx socket_muzzle",
        "effect_scale": 0.9,
        "effect_world_aligned": false
    },
    ....
}
```

Depending on various events, you can add audio and visual accompaniment to the unit. For example, when shots are fired or the cursor is selected.

The event-specific fields contain internal fields for defining audio tracks and visual effects.

    "audio_cue": "/SE/Weapons/base/base_fire_laser"
The audio track field defines the path to the sound effect.

    "effect_spec": "/pa/effects/specs/default_explosion_bot.pfx"
The effect field defines the visual effects that occur when an event is triggered. The record has the format: path/to/effect of the bone_3d_model. The bone is the point of the visual model where the effect will be reproduced.

In one such line, you can define several effects at once.

    "effect_spec": "/pa/units/air/strafer/strafer_muzzle_flash.pfx socket_muzzle01 /pa/units/air/strafer/strafer_muzzle_flash.pfx socket_muzzle02 /pa/units/air/strafer/strafer_muzzle_flash.pfx socket_muzzle03 /pa/units/air/strafer/ strafer_muzzle_flash.pfx socket_muzzle04"
The entry looks like as follows: path bone path bone path bone path bone. All parameters are separated by a space.

    "effect_scale": 0.9
Defines the scale of the effect. It can take any values. 0.9 means that the effect will be only 90% of the original size.

The event **does not have to** define fields for the effect or audio. It is also not necessary to define any events at all.

List of events:

> build_complete, child_attached, child_detached, destroyed, died,
> disabled, enabled, fired, fired0, fired1, fired2, fired3, linked,
> spawned, teleported

    "effect_world_aligned": false

Determines whether the effect will appear relative to the planet. If the value is false, then the effect will be created in the space of space, i.e. without having a connection with the planet.

#### Dynamic effects

```json
"fx_offsets": [
    {
        "type": "energy",
         "filename": "/pa/units/orbital/radar_satellite_adv/radar_satellite_adv_dish01_on.pfx",
         "bone": "bone_radarPivot01",
         "offset": [ 1.449, 0, -1.536],
         "orientation": [ 0, 90, 0]
    },
    {...},
    {...} 
]
```

Dynamic effects are defined by the *fx_offsets* field. This field represents a list of effects.

The *type* field defines the condition for displaying the effect.
The *filename* field defines the path to the effect.
The *bone* field defines the bone relative to which the effect will be located.
The *offset* field defines the placement point of the effect relative to the bone.
The *orientation* field determines the angle of rotation relative to the bone.

Display conditions:

- energy - with a sufficient amount of energy required for the unit
- idle - when idle
- moving - when moving
- moving_forward - when moving forward
- enabled - when enabled
- build - during construction

#### Cyclic sounds and selection

    "audio": {...}
The audio field contains parameters and events for playing sounds in certain situations. More details can be found here (link to audio)

### Old

#### Mass teleportation

    "teleportable": {}
This field must contain a unit that can be teleported using a mass teleport.

#### Unit names

    "unit_name":"Single Laser Defense Tower"
    "si_name": "commander"
The first field was responsible for the name of the unit at the engine level. The second field was responsible for the name of the unit icon.

## Unknown effect

    "usable": true

    "physics" (radius, air_friction, underwater = true, gravity_scalar, add_to_spatial_db = false, allow_underground = true, collision_layers, push_sideways = true, allow_pushing: true)
    (Pushing units in physics is especially incomprehensible, in particular for flight units, except for horsefly)

    stop_clears_nearby_targets
    maintain_priority_target

    "air_height_threshold": 50

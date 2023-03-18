## General

The logic and properties of each weapon and tool are described in the main json file. In the game, all weapons and tools are tools. The tool file is defined by fields with values specific only to the tool. In addition, this file in the overwhelming case has a name corresponding to the purpose and affiliation.

## Fields
> The following are the main fields for determining weapons and tools

### Gameplay

#### Base tool

    "base_spec": "/pa/tools/base_turret/base_turret.json"
Some properties are already pre-registered in base_turret.json. In order not to prescribe them every time, you can add a basic tool, on the basis of which the current tool will be created.

#### Type

    "tool_type": "TOOL_Weapon" or "tool_type": "TOOL_BuildArm"
This field defines the type of tool. There are two types in total. TOOL_Weapon is used for weapons, and TOOL_BuildArm is used for construction tools.

#### Projectile

    "ammo_id": "/pa/units/land/bot_bomb/bot_bomb_ammo.json"
This field defines the projectile that will be used for the attack. The value is the path to the json of the ammunition.

#### Layer

    "spawn_layers": "WL_Underwater"
This field defines the layer on which the projectile will appear.

#### Rate of fire

    "rate_of_fire": 1.0
This field determines how many seconds will pass between shots.

#### Range of application

    "max_range": 60
This field defines the horizontal distance of the tool application.

#### Application height

    "height_range": 150
This field defines the distance of the tool application relative to the ground, i.e. vertically.

#### Rotation speed

    "yaw_rate": 45
    "pitch_rate": 45
These fields determine the rotation speed of the tool.

Yaw - responsible for horizontal rotation (right-left)
Pitch - responsible for vertical rotation (top-bottom)

#### Rotation limit

    "yaw_range": 180
    "pitch_range": 45
These fields determine the maximum degree of rotation of the tool.

Yaw - responsible for horizontal rotation (right-left)
Pitch - responsible for vertical rotation (top-bottom)

#### Premature firing

    "firing_arc_yaw": 45
    "firing_arc_pitch": 45
This field defines the area relative to the muzzle in degrees in which shooting can be conducted without direct guidance. Thus, if the target hits this area, the weapon fires even before it turns the muzzle directly at the target.

Yaw - responsible for horizontal rotation (right-left)
Pitch - responsible for vertical rotation (top-bottom)

#### Arc shooting

    "max_firing_velocity": 150,
    "min_firing_velocity": 100,
    "arc_type": "ARC_High"
These fields determine the possibility of arc shooting.

The maximum speed affects the firing range at a long distance. The minimum firing speed affects the range at close range.  

The type of arc determines the flight curve. There are three types: ARC_Low, ARC_High, ARC_Both - however, only ARC_High is used everywhere. ARC_Low makes the maximum arc height lower.

#### Starting position

    "idle_aim_delay": 2
This field determines the number of seconds before the tool returns to its standard position. If the value is zero, the tool will immediately return to the standard position.

If the value is equal to *-1*, the device will not return to its original position.

#### Deviation

    "firing_standard_deviation": 3.5
This field determines the angle of deviation when shooting.

#### Distributed shooting

    "spread_fire": true
This field determines the possibility of firing at different targets during one salvo. If true, each subsequent shot in the salvo will be directed at the nearest live target. If the value is false, each shot in the salvo will be directed at one target, even if it has already been destroyed.

#### Carpet shooting

    "carpet_fire": true
    "carpet_wait_for_full_ammo": true
These fields determine the method of carpet shooting.

The first field determines the possibility of carpet shooting. If the value is *true*, the unit will fire until the ammunition is completely emptied. The presence of live enemies after the start of firing does not matter.

#### Automatic shooting

    "auto_attack": true
This field determines the possibility of automatic tool firing, firing without giving an order.

#### Death after shot

    "self_destruct": true
This field determines whether the media will be destroyed when using the tool.

#### Ignoring goals

    "no_busy_auto_attack": true
This field determines the possibility of firing at secondary targets. Targets are considered secondary if the unit is given a specific target to attack.

This is how the behavior of exploding bots is implemented, which can pass near enemy objects and not attack everything in a row except the main target.

#### Search for goals

```json
"target_layers": [
    "WL_LandHorizontal",
    "WL_WaterSurface",
    "WL_Air"
]
```

This field defines the list of world layers in which goals will be searched.

#### Excluding goals

    "exclude_unit_types": "Hover | WaterHover"
This field can exclude unit types from the list of potential targets using the selection syntax.

#### Priority of goals

```json
"target_priorities": [
    "Mobile - Air",
    "Naval",
    "Structure - Wall",
    "Wall"
]
```

This field determines the priority of goals. The tool will be applied with the priority corresponding to the list. If a potential goal is out of the list and there are no other goals from the list, then this potential goal will be selected.

Using the selection syntax, you can define groups of goals for prioritization. The selection syntax (link to fetch syntax).

#### Search for shells

```json
    "auto_task_type": "anti_entity",
    "anti_entity_targets_units": false,
    "anti_entity_targets": [
    "/pa/units/land/nuke_launcher/nuke_launcher_ammo.json"
]
```

These three fields define the logic for searching for projectiles as a target. Even if *auto_attack* takes the value *false*, a shot will be fired when a projectile appears.

#### Manual shot

    "manual_fire": true
This field determines the possibility of manual fire.

### Ammunition

#### Ammunition type

    "ammo_source": "energy"
This field defines the type of ammunition used as the accumulative mechanics of the tool.

Types of ammunition:
> energy, metal, time, unlimited, factory

The time ammunition type is used by the Ragnarok unit. Also, with the help of this type of ammunition, it is possible to implement the mechanics of volley fire, where seconds will indicate the recharge of a separate projectile. Accordingly, the tool will be able to accommodate several recharges.

The time is counted in seconds. 1 - one second. 0.5 - half a second.

The type of ammunition factory is used to obtain a really created ammunition. Such mechanics are used by nuclear installations and guns of units. The tool will access the carrier and, specifically, its factory module.

#### Ammunition capacity

    "ammo_capacity": 1.5 or "ammo_capacity":12000
This field determines the ammunition capacity in the tool.

#### Ammunition per shot

    "ammo_per_shot": 0.5 or "ammo_per_shot": 2000
This field determines how much ammunition will be spent when used.

#### Ammunition demand

    "ammo_demand": 100
This field determines how many resources the tool requires per second when recharging. Works only for energy and metal types.

### Construction

#### Consumption

```json
"construction_demand": {
    "energy": 2000,
    "metal": 20
}
```

This field determines the amount of injected metal and the energy consumed during construction.

#### Repair

    "auto_repair": true
This field determines the possibility of automatic repair of nearby damaged targets.

#### Assist

    "can_only_assist_with_buildable_items": false
This field determines the possibility of helping to build buildings that the unit cannot build.

#### Assist layer

    "assist_layers":["WL_AnyHorizontalGroundOrWaterSurface","WL_Air","WL_Underwater"]
This field defines a list of layers in which construction assistance can be provided.

#### Reclaim

    "auto_reclaim": true
This field determines whether resources can be automatically assembled within range.

#### Reclaim layer

    "reclaim_types":["Unit","Wreckage","Feature"]
This field defines a list of the types of resources to be collected. There are three types in total.

## General

The logic of factories is similar to ordinary buildings, except that the factory must have some fields to configure the output of units and time intervals.

Units that can be built by factories must have the unit type "FactoryBuild".

    "buildable_types": "Bot & Mobile & FactoryBuild"
Such an entry is present in the bot factory.

In order for the factory to create units, it needs to install a device in the *tools* field. The amount of metal poured into the unit and the energy consumption is indicated in the device.

## Fields
>
> The following are the main fields unique to factories
>
### Gameplay

#### Waiting before the release of the unit

    "wait_to_rolloff_time": 0
This field determines the time that the factory waits after the unit is built and before the unit is released into the world. Measured in seconds.

#### Waiting after the release

    "factory_cooldown_time": 3
This field defines the time that the factory waits after the release of the unit and before the start of the creation of a new unit. Measured in seconds.

#### Output directions

``` json
"rolloff_dirs": [
    [0,1,0],
    [0,-1,0]
]
```
This field defines the directions in which the unit will exit the factory. The values in the list are vectors.

### Changing logic

#### Redefinition

    "factory": { ... }
This field overrides the logic of the factory. If the building was not intended as a factory, then this logic will be added.

#### Passing orders

    "pass_on_orders": false
This field determines whether units will execute orders given to the factory. The standard value in all factories is *true*.

#### Spawn points

    spawn_points: [ "coolBone", "someBody", "whatBone" ]
This field defines the list of bones in the base of which the constructed objects will be placed. You can add the same bone several times (this is done in the cannon units)

#### Warehousing

    "store_units": true
This field determines whether the created objects will be stored or released to the world. The size of the warehouse depends on the number of spawn points. Each created object will be assigned to the point of appearance.

#### Displaying

    "hide_stored_units": true
This field determines whether the created objects will be displayed in the world.

#### Shells

```json
"buildable_projectiles": [
 "/pa/units/land/nuke_launcher/nuke_launcher_ammo.json"
]
```

This field is LOCATED OUTSIDE the *factory* field and defines a list of shells that the factory can build explicitly in the game world. This mechanism is used by nuclear installations and protection against them.

Unlike units, projectile definition does NOT use sampling syntax.

In order for the plant to start construction immediately, you need to define the following fields in the *factory field*:

    "initial_build_spec": "/pa/units/land/nuke_launcher/nuke_launcher_ammo.json",
    "default_build_stance": "Continuous"
The first field defines the starting object for construction. The second field defines the logic of construction, in this case defined as "start construction if storage points are available".

#### Capsules

    "deploy_projectile": "/pa/units/land/unit_cannon/unit_cannon_deploy.json"
This field defines the capsule to which the unit will be assigned when released from the factory. The capsule has its own flight logic. After the death of the capsule due to natural causes, a unit assigned to the capsule will appear. The capsules are used by the guns of the units and the orbital plant standing on the ground.

#### Displaying capsules

    "hide_deploy_projectile": true
This field determines the display of the capsule when it is in the factory.

## General

The field of weapons and tools (hereinafter devices) in the unit's json contains many of its own fields. Below are all the fields.

## Properties

### Main field

    "tools": [ {...}, {...} ]

The *tools* field defines the list of devices that the unit will use. There may be

### Purpose of devices

To add a device to a unit, you need to insert its definition into the list of devices.
```json
"tools": [
    {
        "spec_id": ...,
        "aim_bone": ...,
        "record_index":...,
        "fire_event": ...,
        "muzzle_bone": ...,
        "projectiles_per_fire": ...
    }
]
```

#### Definition

    "spec_id": "/pa/units/orbital/titan_orbital/titan_orbital_tool_weapon_orbital.json"
This field indicates a file with a full description of the device. It is mandatory.

#### Linking aiming

    "record_index": 0 or "record_index": number
The field defines the aiming group. Devices with the same index belong to the same group and are looking for the same goal.

By assigning different indexes to the device, you can make it aim independently. For example, a ship has several guns that can search for targets independently of each other.

By setting the field to -1, you can disable aiming altogether.

#### Number of projectiles fired

    "projectiles_per_fire": 1 or "projectiles_per_fire": number
This field determines the number of projectiles launched when fired. The projectile will fly out of the muzzle. If the device has several muzzles, and the projectile is fired once, then each subsequent shot will change the muzzle cyclically. If there are as many shells as there are muzzles, then the shells will be distributed between the muzzles.

#### Muzzle

    "muzzle_bone":"some_bone" or "muzzle_bone"; ["1_bone", "2_bone", "...", "cool_bone"]
The muzzle determines the point from which the projectile will fly out. You can define one muzzle or several for one device at once.

#### Aiming bone

    "aim_bone": "socket_aim"
This field defines the bone of the model whose direction will be used for aiming.

#### Shot event

    "fire_event": "fired0" or fired1, fired2, fired3
The field defines the event caused by the shot. Required for effects.

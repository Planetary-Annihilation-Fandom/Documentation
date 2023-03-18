## General

The field of view/intelligence in the unit's json contains its own fields responsible for the field of view and visibility for other units. Below are all the fields.

## Properties

### Layers

List of layers:

- surface_and_air - responsible for visibility on land, water and air.
- underwater - responsible for visibility under water.
- orbital - responsible for visibility at the orbit level.
- celestial - responsible for the visibility of the entire outer space.
- minefield - responsible for visibility in the minefield layer.

### Visibility for others

#### General

```json
"recon": {
    "observable": {"always_visible": true}
}
```

The observable field with its internal properties is responsible for visibility for other units. The example shows an option when the unit is always visible and from everywhere.

#### Limitation of the visibility layer

    "layer": "underwater"
The layer field is responsible for which visibility layer the unit can be seen in. In the example, if another unit has no vision underwater, then this other unit will not see this unit.

#### Radar visibility restriction

    "ignore_radar": true
When this field is included in the observable field, the unit will not be marked by radar. Direct eye contact will still work.

#### Limitation of visibility by sight

    "ignore_sight": true
When this field is included in the observable field, the unit will not be visible to the eyes. The radar will still display the unit.

#### Visibility is always

    "always_visible": true
Shows the unit at any distance and on any planet.

#### Visibility is always after the meeting

    "retain_visible": true
This parameter is responsible for showing the unit after the first meeting. Works similarly to *always_visible* after showing the unit. This parameter occurs mainly in the effects of destruction.

#### Show old information

    "show_ghost": true
This parameter is responsible for showing the unit after the last meeting, but only the layout will be visible. It is actively used in buildings, because after reconnaissance, models of buildings can be seen in the fog of war.

#### Area of occurrence

    "sphere_radius": 5
This parameter is responsible for the technical size of the unit, which will be used to determine whether the unit is visible or not. It is used in effects so that they can be seen on the edges of the fog of war.

### Vision and Interference

#### General

```json
"recon": {
    "observer": {
        "items": [
        {
            "layer": "surface_and_air",
            "channel": "sight",
            "shape": "capsule",
            "radius": 100
        },
        {
            "layer": "surface_and_air",
            "channel": "radar",
            "shape": "capsule",
            "radius": 260,
            "uses_energy": true
        },
        {
            "layer": "surface_and_air",
            "channel": "radar_jammer",
            "shape": "capsule",
            "radius": 75,
            "uses_energy": true
        }
    ]
 }
}
```

The observer field consists of the items field, which defines the vision options, channels. In the example given, the unit has vision in the surface and air layer, as well as a radar and a jamming generator.

#### Channel

    "channel": "sight"
The channel field is responsible for the type of vision.

Channel List:

- sight - eye contact.
- radar - built-in radar.
- radar_jammer - built-in interference generator. Although this is not vision, it is also defined in observable.items.

#### Field of view

    "shape": "capsule" | "shape": "sphere"
This field is responsible for the field of vision and interference generation. For units located at the level of the planet, it is worth using a capsule shape, for correct visibility of air and underwater units. The spherical shape is used by orbital units for the orbital layer.

#### Radius

    "radius": 150
This field is responsible for the distance at which the units are visible.

#### Energy dependency

    "uses_energy": true
This parameter determines the dependence of the vision/channel operation on the overall energy efficiency of the player. The parameter setting the threshold for use is found in the description of the unit.

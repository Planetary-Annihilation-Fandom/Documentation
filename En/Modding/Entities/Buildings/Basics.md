## General

The logic and properties of each building have basically the same fields as the units. This behavior is due to the fact that everything in the game is considered a unit.

The main difference between buildings and mobile units is in the physical and navigational settings: they cannot be pushed and are an obstacle that cannot be passed or pushed through when searching for a path. For these reasons, buildings can be regarded as units.

The only major difference in logic is in the factories. They have their own behavior at the level of the game engine and their own fields suitable only for them.

For all of the above reasons, you can treat buildings other than factories as units that stand. In addition, in most cases you can set the base settings for a building by specifying a base json.

    "base_spec": "/pa/units/land/base_structure/base_structure.json"

## Fields

> The following are the main fields that are unique to or different from those of a unit.

### Differences

#### Physics

```json
"physics": {
 "type": "Structure",
 "shape": "Box",
 "collision_layers": "WL_AnyHorizontalGroundOrWaterSurface",
 "radius": 1,
 "air_friction": 1.0,
 "allow_pushing": false,
 "push_sideways": false,
 "allow_underground": false
}
```

Physics field in *base_structure.json* is defined in such a way that the building has a physical shape in the form of a cube, it could not be pushed and put underground. Also, such a building is in contact with all physical objects on land and water.

#### Navigation

```json
 "structure": {
 "cost_stamp": {
  "shape": "box",
  "type_data": [
  {
   "move_type": "land-small",
   "stamp_type": "structure"
  },
  {
   "move_type": "amphibious",
   "stamp_type": "structure"
  },
  {
   "move_type": "amphibious-large",
   "stamp_type": "structure"
  },
  {
   "move_type": "hover",
   "stamp_type": "structure"
  },
  {
   "move_type": "water-hover",
   "stamp_type": "structure"
  },
  {
   "move_type": "hover-large",
   "stamp_type": "structure"
  },
  {
   "move_type": "deepwater",
   "stamp_type": "structure"
  },
  {
   "move_type": "underwater",
   "stamp_type": "structure"
  }]
 }
}
```

Since the building does not need to move, it does NOT need to define the entire navigation field. There is a special record form for this as the *structure* field. This field sets the priority setting of the building in navigation, i.e. how important is this unit, and the building is a unit, to bypass and not crash.

#### Model

```json
"model": [
    {
     "layer": "WL_LandHorizontal",
     "skirt_decal": "/pa/effects/specs/skirt_defense.json",
     ...
    },
    {
    "layer": "WL_WaterSurface",
    ...
    }
]
```

Unlike units, a building can be given several model options depending on the type of surface. All model settings are the same as for the unit.

The *skirt_decal* field defines the texture under the bottom of the building.

### Placement

#### The size of the occupied area

    "placement_size": [ 27, 27 ]
This field is responsible for the size of the occupied area when placing the building.

#### Construction format

    "area_build_type": "Line" or "area_build_type": "Sphere"
This field determines how buildings will be placed when the cursor is stretched over the surface.

#### Distance when placing

    "area_build_separation": 18
This field determines how far the buildings will stand when the cursor is stretched.

#### Alternative construction format

    ""art_area_build_type": "Line" or "alt_area_build_type": "Sphere"
This field is responsible for how buildings will be placed when the cursor is stretched and the alternative placement key is held down.  

#### Distance at alternative placement

    "alt_area_build_separation": 10.0
This field determines how far the buildings will stand when you stretch the cursor and hold the alternative placement key.

#### Placement template

    "alt_area_build_pattern": [ [] ]
(There was no clear explanation)

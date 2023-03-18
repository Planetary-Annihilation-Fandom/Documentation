## General

The navigation field in the unit's json contains many of its own fields responsible for movement speed, acceleration, maneuverability, physics, etc. Below are all the fields.

## Properties

### Physics

#### Object type

    "type": "land-small"
You need to specify the type of unit in navigation to get a more optimized and correct path search.

List of types:  
> "land-small", "amphibious", "amphibious-large", "hover",
> "hover-large", "water-hover", "deepwater", "underwater", "air",
> "orbital"

#### Acceleration

    "acceleration": 50
It affects how fast the unit will gain maximum speed.

#### Braking

    "brake": -1 | "brake": 50
This field affects the braking of the unit when stopping - acceleration is the opposite. The number -1 means an instant stop of the unit.

#### Turn speed

    "turn_speed": 720 | "turn_speed": 90
The speed of rotation affects how fast the unit's body will turn. The first example is taken from a bot, and the second from a tank.

#### Takeoff and landing speed

    "vertical_speed": 40
The speed at which the unit rises and falls in the air.

#### Turn in place

    "turn_in_place": true
In-place rotation can be enabled by adding this field.

### Positioning Land and Sea

#### Location in the group

    "group_preference": "front"
This field affects how the unit will stay in the group. This is more a preference for the unit than a strict rule.

List of positions:

- front
- back

### Positioning Air

Basically, these settings relate to air units.

#### Attack behavior

    "aggressive_behavior": "line" | "aggressive_behavior": "circle"
The behavior determines how the unit will position itself relative to the enemy. The first example is taken from a fighter and a bomber.  The second one is a helicopter and an icarus.

#### Distance when attacking

    "aggressive_distance": 60.0
This field is responsible for what distance the unit will try to maintain when firing. For example, you can clearly see the distance of the helicopter relative to the target when shooting.

#### The height of

    "aggressive_Height" attack: 1.0
When conducting an attack, the unit will descend or decrease relative to the target. However, this setting has a negligible effect on both gameplay and, in extreme cases, visual perception.

> Could potentially be useful if the game had
> Anti-Air(AA) without splash. But every anti-aircraft weapon in the game
> has at least a small splash.
>
> Theoretically, if you are approaching AA, which does not have a splash, then
> if your Bombers are a little taller than the Fighters, it's
> means that there is a chance that the Fighters will take shots at
> myself for the Bombers, which may be useful.
>
> But in practice it doesn't do much, because all AA have some
> splash.
>
> But it wasn't always like that. In the past, Bots could attack the air. In
the past , Fighters had a decent chance to tank shots for
> Bombers when approaching Bots.

### Influence on other units

#### Behavior in a crowd

```json
"park_stamp": {
    "shape": "sphere",
    "cost": 9,
    "type_data": [
        {"move_type": "land-small", "stamp_type": "simple"},
        {"move_type": "amphibious","stamp_type": "simple"},
        {"move_type": "hover","stamp_type": "structure"},
        {"move_type": "water-hover","stamp_type": "structure"}
    ]
}
```

Units can bypass each other when searching for a path. To determine who will or will not bypass the unit, you need to add information to the navigation according to the example above.

Fields in **park_stamp**:

- **shape** - is responsible for the type of space occupied by the unit. "sphere" or "box"
- **cost** - means the price of crossing the occupied space. The higher the value, the less other units will pass through, i.e. push, and come close.
- **type_data** - defines the algorithm of occupied space for each type of navigation. The first two lines indicate that the units using the navigation type are *"land-small"* or *"amphibious"* they will perceive this unit as an ordinary obstacle through which you can squeeze or push. The second two lines indicate for *"hover"* and *"water-hover"* that this unit is a building and it needs to be bypassed as if it were a building.

### Visual addition

#### Bank factor

    "bank_factor": 1
The degree of roll determines how much the unit will rotate along the longitudinal axis. It is mainly used by air units. An example of the field is taken from a bomber.

## Unknown influence

    "dodge_radius"
    "dodge_multiplier"
    "wobble_factor"
    "wobble_speed"
    "hover_time"
    "ignore_overshoot" (perhaps this field affects the unit ignoring the waste of ammunition when firing)
    "leash_behavior": "line",
    "leash_distance": 0

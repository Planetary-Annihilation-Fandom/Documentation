## General

The audio field in the unit's json contains many of its own fields. Below are all the fields.

## Properties

### Main field

```json
"audio": {
    "loops": {
        ....
    },
    "selection_response":{
        "cue": "/SE/Selection/xxx/yyy"
    }
}
```

The audio field contains additional fields for cyclic sounds (*loops*) working at a certain moment, and the sound effect of the unit selection (*selection_response*). The *audio* field, as well as its subfields in particular, are not required to be added.

#### Selection sound

    "selection_response": {
        "cue": "/SE/Selection/xxx/yyy"
    }
The *selection_response* field contains only one parameter *cue* that defines the path to the sound effect. This sound is triggered when a unit is selected.

#### Cyclic sound

```json
"loops": {
    "move": {
        "cue": "/SE/Movement/air/air_gunship_loop",
        "flag": "vel_changed",
        "should_start_func": "is_moving_laterally",
        "should_stop_func": "is_not_moving",
        "interplanetary": false
    },
    ...,
    ...
}
```

The *loops* field contains several predefined subfields (hereinafter events).

List of events. At the moment , three events are known:

    move, build, enabled

The *flag* field is the trigger condition.
The *should_start_func* field is the function with which the sound starts.
The *should_stop_func* field is the function where the sound stops.

The *interplanetary* field defines the sound reproduction between planets. The standard value is false.

#### Move event

```json
"move": {
    "cue": "/SE/Movement/bot/assault_loop",
    "flag": "vel_changed",
    "should_start_func": "is_moving" or "is_moving_laterally",
    "should_stop_func": "is_not_moving"
}
```

The *flag* field is equal to *vel_changed*. This flag is triggered when the speed changes.

The *should_start_func* field can take two different values. The value of *is_moving* indicates a simple movement. The value of *is_moving_laterally* indicates sideways movement, this can be observed in helicopters.

The *should_stop_func* field is equal to *is_not_moving*. Thus, the sound stops playing when you stop.

#### Build event

```json
"build": {
    "cue": "/SE/Construction/Commander_contruction_beam_loop",
    "flag": "build_target_changed",
    "should_start_func": "has_build_target",
    "should_stop_func": "no_build_target"
}
```

The *flag* field is equal to *build_target_changed*. This flag is triggered when a construction target appears and construction begins.

The *should_start_func* field is equal to *has_build_target*. The sound will start playing when the construction starts.

The *should_stop_func* field is equal to *no_build_target*. Thus, the sound stops playing in the absence of construction.

#### Enabled event

```json
"enabled": {
    "cue": "/SE/Buildings/helios_teleporter_loop",
    "flag": "enable_changed",
    "should_start_func": "is_enabled",
    "should_stop_func": "is_disabled"
}
```

The *flag* field is equal to *enabled_changed*. This flag is triggered when the unit's on state changes.

The *should_start_func* field is *is_enabled*. The sound will start playing when the unit is turned on.
The *should_stop_func* field is equal to *is_disabled*. The sound will stop playing when the unit is turned off.

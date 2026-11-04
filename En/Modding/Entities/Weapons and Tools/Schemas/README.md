# Weapon, tool and ammo schemas

These draft-07 JSON Schemas cover the separate tool and ammunition files referenced by unit specs. Use them for editor diagnostics or content validation; they are advisory and do not replace the game engine's loading behavior.

| Schema | Files covered | Related documentation |
|---|---|---|
| [tool.schema.json](tool.schema.json) | Weapon and build-arm tools (`*_tool_weapon.json`, `*_build_arm.json`) | [Weapons and tools](../Basics.md), [unit tools](../../Units/Tools.md) |
| [ammo.schema.json](ammo.schema.json) | Ammunition specs (`*_ammo.json`) | [Weapons and tools](../Basics.md) |

A unit references a tool through `tools[].spec_id`; a weapon tool can reference ammunition through `ammo_id`. These schemas validate each JSON file independently and do not verify that referenced files exist or that the references agree.

## Limits

- The engine does not run these schemas. They model fields read by the parsers and help catch malformed values.
- Objects allow unknown properties to reflect engine behavior. A typo in an unrecognized key may pass both the engine and the schema.
- `base_spec` inheritance is not resolved. A partial child file may fail required-field checks when its base supplies those fields. Validate the merged spec or treat those failures as expected for partial files.
- Some large enum sets are accepted as strings. Check the related reference pages for allowed values.

## Validate

Run from the root of a workspace that contains this documentation repository and your mod content. With `ajv-cli` installed:

```bash
ajv validate -s "En/Modding/Entities/Weapons and Tools/Schemas/tool.schema.json" \
  -d "path/to/mod/content/**/*_tool_weapon.json" --spec=draft7 --all-errors

ajv validate -s "En/Modding/Entities/Weapons and Tools/Schemas/ammo.schema.json" \
  -d "path/to/mod/content/**/*_ammo.json" --spec=draft7 --all-errors
```

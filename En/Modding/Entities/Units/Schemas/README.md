# Unit and animation tree schemas

These draft-07 JSON Schemas describe unit specification files and animation tree files. Use them for editor diagnostics or content validation; they are advisory and do not replace the game engine's loading behavior.

| Schema | Files covered | Related documentation |
|---|---|---|
| [unit.schema.json](unit.schema.json) | Unit specs, including units and structures (`*.json`, `base_*.json`) | [Unit properties](../Basics.md), [unit animation](../Animation.md) |
| [anim_tree.schema.json](anim_tree.schema.json) | Animation trees (`*_anim_tree.json`) | [Unit animation](../Animation.md) |

## Limits

- The engine does not run these schemas. They model fields read by the parsers and help catch malformed values.
- Objects allow unknown properties to reflect engine behavior. A typo in an unrecognized key may pass both the engine and the schema.
- `base_spec` inheritance is not resolved. A partial child spec may fail required-field checks when its base supplies those fields. Validate the merged spec or treat those failures as expected for partial files.
- Some large enum sets are accepted as strings. Check the related reference pages for allowed values.

## Validate

Run from the root of a workspace that contains this documentation repository and your mod content. With `ajv-cli` installed:

```bash
ajv validate -s "En/Modding/Entities/Units/Schemas/unit.schema.json" \
  -d "path/to/mod/content/units/**/*.json" --spec=draft7 --all-errors
```

For editor validation, configure a JSON Schema association for the unit and animation-tree file patterns and point it to the corresponding schema above. Keep editor mappings outside the game JSON when possible; unknown keys such as `$schema` are ignored by the engine but can still obscure the actual spec contents.

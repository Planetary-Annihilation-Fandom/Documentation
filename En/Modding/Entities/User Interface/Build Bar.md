## How it works

In order for a unit or structure to be selected for creation or construction, it must be added to the construction list.

The file defining this list is called **"shared_build.js"**. This is a script used by the game interface to display the construction and production window. The newBuild variable contains strings containing the path to the main json entity and the location settings in the window.

## Structure

The string has the format: **"path_to_json_file.json": ["category", 0, { row: X, column: Y, titans: true }]**.

- path_to_json_file.json is the path to the main json entity.
- category is the section where the entity and its icon will be located. Categories are created during the game. Therefore, you can define absolutely any categories, they will be dynamically created at the start of the match.
- The digit 0 after category is an unused but necessary value. It was used in early versions of the game.
- row: X is the row number, where X is a number. For example row: 1, row: 3
- column: Y is the column number, where Y is a number. For example column: 0, column: 3
- titans: true is the standard value indicating the need to expand Titans for the game, you should not change it.

The count of rows and columns starts from the upper left edge.

## Examples

Script with usage examples:

```js
var  newBuild = {
    "/pa/units/land/unit1/unit1.json": ["category1", 0,{ row: 0, column: 4, titans: true }],
    "/pa/units/sea/unit2/unit2.json": ["category2", 0,{ row: 2, column: 2, titans: true }],
}

if (Build && Build.HotkeyModel && Build.HotkeyModel.SpecIdToGridMap) {
    _.extend(Build.HotkeyModel.SpecIdToGridMap, newBuild);
}
```

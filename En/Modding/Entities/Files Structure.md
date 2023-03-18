## How it works

Entities have a common structure, the files of which describe the logic, appearance and ways of interaction. Usually, a separate folder is created for one entity, located along the path **".../pa/units/subcategory/unit_folder"**, where "..." is the root folder of the modification, and subcategory can be any folder, for example "land", "sea", "orbital". Weapons and dependent entities are placed in the same folder for easy search and editing.

## Structure

A complete, ready-to-publish entity should have the following files:

- entityname.json (Main .json). This json describes many basic properties: name, description, type, vision, visual, sounds, navigation and much more.
- entityname_xxx_yyy.papa. Files of this type represent the entity model and animations, as well as textures and materials. Most of the existing entities can be seen to have .papa files for the model, standard animations, textures and materials. Papa is a universal game engine file that can contain different types of data.
- entityname_icon_buildbar.png. This image is used in the construction panel and the sandbox panel. Not to be confused with the strategic icon used to display the unit in the game.

## Note

In the entity files of the standard game, you can find files with the .settings extension. These files are not required for stable operation and were most likely used in early versions of the game.

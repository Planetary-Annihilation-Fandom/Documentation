## General

There are two types of entity icons - general and strategic. All units and buildings have both types of icons.

### Files

The general icon is located in the folder with the main json entity. It is used to display the appearance of the entity in the construction and production window. Its format is as follows: entityname_icon_buildbar.png.
> Format - **entityname**_icon_buildbar.png. The size is 60x60 pixels.

### Colors

Any colors are used. Basically, the colors of the fraction to which the entity will belong are used.

## Strategic

### Files

The strategic icon is located in the folder on the path **".../ui/main/atlas/icon_atlas/img/strategic_icons/"**, where "..." is the root folder of the modification.
> Format - icon_si_**entityname**.png. The size is 52x52 pixels.

### Colors

In order for the strategic icon to acquire the color of a team or player during the game, it needs to be colored according to a special rule: red **"#fc0000"** indicates a black outline, and yellow **"#ffff00"** indicates the color of the team or player.

## Example and explanation

    "buildable_types": "Land & Structure & Advanced - Factory| Factory & Advanced & Bot & Land | FabAdvBuild | FabBuild | Titan & Bot"
This field defines the entities that a unit can build. It is impossible to designate a specific entity, but you can use exclusive and unifying combinations of types to limit or expand the list of entities for construction.

Syntax: "**&**" - clarifying(and)(must have type), "**-**" - exclusive (not)(must not have type), "**|**" - unifying(or)(also add to the list).

The example above indicates the following:
A unit can build anything that has

1. Types of Land and Structure and Advanced and does not have a Factory.
2. Next comes the symbol "|", combining the first condition with the following. I.e. entities from the first condition and subsequent ones will be available.
3. The following condition requires the presence of type Factory and Advanced and Bot and Land. Thus, an advanced bot factory is added.
4. Next come the FabAdvBuild + FabBuild + Titan & Bot types. The last expression says that it is possible to build an entity of the Titan type, which should be of the Bot type.

The first and second conditions contain Factory, but in the first condition it is removed, and in the second it is added. This is done in order to select all advanced entities, i.e. essentially all advanced ground structures. But in the game, bots, and the example is taken from an advanced bot builder, should not be able to build advanced tank and air factories. For this reason, factories are excluded in the first expression, so as not to add factories of planes and tanks. In the second expression, on the contrary, only the advanced factory is added.

### General

Each of the layers requires a "WL_" to be placed in front of it.

#### All layers

List of layers used in the world:

- WL_AnyLayer
- WL_Invalid
- WL_LandHorizontal
- WL_LandVertical  
- WL_AnyLand
- WL_Structure
- WL_Seafloor
- WL_AnyHorizontalGround  
- WL_AnyGround
- WL_Underwater
- WL_DeepWater
- WL_WaterSurface  
- WL_AnySurface
- WL_AnyHorizontalGroundOrWaterSurface
- WL_AnyWater  
- WL_AnyGroundOrWater
- WL_Air
- WL_Orbital  
- WL_AirOrOrbital
- WL_Lava
- WL_Unpathable

#### Simplified recording forms

Layer groups combine some of the layers to provide layered behavior. Combinations similar to combinations of several layers are indicated in parentheses:

- **WL_AnyLand** (LandHorizontal | LandVertical)
- **WL_AnySurface** (Structure | LandHorizontal | LandVertical | WaterSurface)
- **WL_AnyGround** (Structure | LandHorizontal | LandVertical | Seafloor)
- **WL_AnyHorizontalGround** (Structure | LandHorizontal | Seafloor)
- **WL_AnyHorizontalGroundOrWaterSurface** (Structure | AnyHorizontalGround | WaterSurface)
- **WL_AnyWater** (WaterSurface | DeepWater | Underwater)
- **WL_AnyGroundOrWater** (AnyGround | AnyWater)
- **WL_AirOrOrbital** (Air | Orbital)
- **WL_AnyLayer**

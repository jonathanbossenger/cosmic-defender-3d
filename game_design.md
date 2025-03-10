# Cosmic Defender 3D - Game Design Document

## Table of Contents
1. Game Overview
2. Core Game Mechanics
3. Player Systems
4. Enemy Design
5. Combat Design
6. Level Design
7. Progression Systems
8. Visual Style
9. Audio Design
10. User Interface
11. Technical Implementation

## 1. Game Overview

### High Concept
Cosmic Defender 3D is a first-person shooter that reimagines the classic Space Invaders in a modern 3D environment. Players defend against waves of aliens using strategic positioning, resource management, and progressive weapon upgrades.

### Core Experience
- Fast-paced, arcade-style combat
- Strategic positioning and threat prioritization
- Progressive power escalation within each session
- Quick, replayable gameplay sessions (10-15 minutes average)

### Target Audience
- Primary: Players aged 12+ who enjoy arcade-style shooters
- Secondary: Fans of classic arcade games
- Tertiary: Casual FPS players looking for quick gaming sessions

### Unique Selling Points
1. Classic Space Invaders mechanics reimagined in 3D space
2. Dynamic weapon evolution system that adapts to playstyle
3. Strategic depth through positioning and upgrade choices
4. Roguelite elements with per-session progression

## 2. Core Game Mechanics

### Movement System
- **Base Movement Speed:** 6 meters per second
- **Area Constraints:** 30-meter diameter circular platform
- **Movement Control:**
  - WASD keys for directional movement
  - Space for quick dodge (2-second cooldown)
  - Shift for temporary speed boost (limited energy)
  - Mouse for view control (180° vertical limit)

### Weapon System

#### Base Weapon: Pulse Cannon
- **Fire Rate:** 2 shots per second
- **Magazine Size:** 20 shots
- **Reload Time:** 1.5 seconds
- **Projectile Speed:** 30 meters per second
- **Base Damage:** 10 points

#### Upgrade Paths
1. **Precision Path**
   - Increased accuracy
   - Higher critical hit damage
   - Slower fire rate
   - Penetrating shots

2. **Rapid Fire Path**
   - Increased fire rate
   - Larger magazine size
   - Spread shots
   - Reduced per-shot damage

3. **Heavy Impact Path**
   - Increased base damage
   - Explosive radius
   - Slower projectiles
   - Knockback effect

### Resource Management
- **Shield Energy:** 100 points, regenerates 5 points per second
- **Weapon Energy:** 200 points, used for special shots
- **Dodge Energy:** 3 charges, regenerates 1 charge every 2 seconds

## 3. Player Systems

### Health System
- **Base Health:** 100 points
- **Shield Capacity:** Up to 100 points additional protection
- **Recovery:**
  - Health does not regenerate naturally
  - Shields regenerate at 5% per second after 3 seconds without damage
  - Health pickups restore 25 points
  - Shield pickups restore 50 points

### Progression Within Session
1. **Wave 1-5:** Basic enemies, standard weapon
2. **Wave 6-10:** First upgrade path available
3. **Wave 11-15:** Second upgrade path unlocked
4. **Wave 16+:** All upgrade paths available, increasing difficulty

### Player Feedback
- **Hit Confirmation:**
  - Visual hit markers
  - Enemy damage numbers
  - Distinctive sound effects
  - Screen shake for powerful hits

- **Damage Feedback:**
  - Directional damage indicator
  - Screen edge damage vignette
  - Controller vibration (if supported)
  - Shield break warning sound

## 4. Enemy Design

### Basic Enemy Types

#### Drone (Tier 1)
- **Health:** 20 points
- **Speed:** 3 meters per second
- **Attack:** Single projectile (5 damage)
- **Behavior:** Direct approach, basic evasion
- **Points:** 100 per kill

#### Soldier (Tier 2)
- **Health:** 40 points
- **Speed:** 4 meters per second
- **Attack:** Burst fire (3 shots, 8 damage each)
- **Behavior:** Strafe while attacking, use cover
- **Points:** 250 per kill

#### Elite (Tier 3)
- **Health:** 80 points
- **Speed:** 5 meters per second
- **Attack:** Tracking projectiles (15 damage)
- **Behavior:** Coordinate with other elites, flank player
- **Points:** 500 per kill

#### Commander (Tier 4)
- **Health:** 150 points
- **Speed:** 3.5 meters per second
- **Attack:** Area denial fields (10 damage per second)
- **Special:** Buffs nearby enemies (+25% damage)
- **Points:** 1000 per kill

### Formation Patterns

#### Basic Diamond (Waves 1-5)
- Formation Layout:
  ```
      D
    D D D
      D
  ```
- 5 drones in fixed pattern
- Moves as single unit
- Predictable attack timing

#### Pincer Formation (Waves 6-10)
- Formation Layout:
  ```
  D     D
   S   S
    S S
     D
  ```
- 7 units (mix of drones and soldiers)
- Splits to flank player
- Coordinated attack patterns

#### Elite Squad (Waves 11+)
- Formation Layout:
  ```
    E   E
   S S S S
  D D D D D
  ```
- Mixed unit types (D: Drone, S: Soldier, E: Elite)
- Layered attack approach
- Shields protect higher tiers

## 5. Combat Design

### Combat Flow
1. **Wave Start**
   - 3-second preparation time
   - Formation announcement
   - Enemy type preview
   - Power-up availability

2. **Active Combat**
   - Enemy formations approach
   - Dynamic positioning
   - Resource management
   - Upgrade decisions

3. **Wave Completion**
   - Score tallying
   - Performance rating
   - Upgrade selection
   - Health/shield restoration

### Combat Mechanics

#### Critical Hit System
- **Head Shots:** 2x damage
- **Weak Points:** 1.5x damage
- **Shield Impacts:** 0.75x damage
- **Visual Feedback:** Distinct hit effects

#### Combo System
- Base multiplier: 1.0x
- +0.1x per consecutive hit
- Max multiplier: 3.0x
- Reset on miss or 2-second gap

#### Damage Types
1. **Energy**
   - Standard weapon damage
   - Shield-piercing capability
   - Blue visual effects

2. **Explosive**
   - Area damage
   - Shield-breaking power
   - Orange visual effects

3. **Plasma**
   - DoT (Damage over Time)
   - Shield disruption
   - Green visual effects

## 6. Level Design

### Arena Layout

#### Central Platform
- 30-meter diameter
- Raised 2 meters from surroundings
- Non-slip surface texture
- Shield generator aesthetics
- Glowing edge markers

#### Cover Elements
- 8 defensive positions
- Destructible barriers
- Shield recharge stations
- Ammunition fabricators
- Dynamic cover states

#### Environmental Hazards
- Energy field boundaries
- Plasma vents (periodic)
- Gravity anomalies
- Shield disruption zones

### Arena Variants

#### Command Center
- Interior environment
- Holographic displays
- Technical aesthetics
- Multiple elevation levels
- Emergency lighting

#### Orbital Platform
- Space backdrop
- Solar panels
- Low gravity zones
- Vacuum aesthetics
- Star field visibility

#### Alien Hive
- Organic architecture
- Bioluminescent lighting
- Pulsing surfaces
- Atmospheric effects
- Alien growth

## 7. Progression Systems

### Wave Progression

#### Early Game (Waves 1-5)
- Basic enemy types
- Simple formations
- Core mechanics tutorial
- Initial upgrade choice

#### Mid Game (Waves 6-15)
- Mixed enemy types
- Complex formations
- Resource management
- Strategic decisions

#### Late Game (Waves 16+)
- Elite enemy focus
- Boss encounters
- Maximum difficulty
- All upgrades available

### Scoring System

#### Point Values
- Base enemy points
- Combo multipliers
- Accuracy bonuses
- Speed bonuses
- Special achievements

#### High Score Features
- Local leaderboard
- Daily challenges
- Personal bests
- Achievement tracking
- Score breakdowns

## 8. Visual Style

### Art Direction

#### Color Palette
- **Player Tech:** Blue and white
- **Enemy Tech:** Red and purple
- **Environment:** Dark grays with neon accents
- **Effects:** Bright, saturated energy colors
- **UI:** Holographic blue

#### Visual Effects
- Energy weapon trails
- Shield impact ripples
- Explosion particle systems
- Damage state indicators
- Environmental ambiance

#### Animation Style
- Smooth weapon movements
- Reactive enemy behaviors
- Fluid player feedback
- Dynamic environment elements
- Impactful hit reactions

## 9. Audio Design

### Sound Effects

#### Weapon Sounds
- Energy pulse firing
- Reload mechanism
- Power-up activation
- Upgrade transitions
- Impact variations

#### Enemy Sounds
- Movement sounds
- Attack warnings
- Death effects
- Formation changes
- Special abilities

#### Environmental Audio
- Platform ambiance
- Shield hum
- Warning signals
- Power fluctuations
- Space atmosphere

### Music System

#### Dynamic Soundtrack
- Intensity-based layering
- Wave progression themes
- Boss battle variations
- Victory/defeat stings
- Menu ambiance

#### Audio Mixing
- Dynamic range compression
- Spatial audio positioning
- Priority-based mixing
- State-driven transitions
- Performance optimization

## 10. User Interface

### HUD Elements

#### Combat Information
- Health/Shield bars
- Ammo counter
- Score display
- Wave indicator
- Combo meter

#### Status Indicators
- Weapon state
- Power-up timers
- Warning indicators
- Objective markers
- Mini-map/radar

### Menu Systems

#### Main Menu
- Play game
- Options/Settings
- Leaderboards
- Credits
- Quit game

#### Pause Menu
- Resume game
- Audio settings
- Control settings
- Return to main menu
- Quick tutorial

## 11. Technical Implementation

### Performance Targets

#### Desktop
- 60 FPS target
- 1080p resolution
- Medium-high settings
- Scalable quality options
- Optimized assets

#### Mobile/Web
- 30 FPS minimum
- Responsive resolution
- Reduced effects
- Touch controls
- Progressive loading

### Core Systems

#### Rendering Pipeline
- Three.js core
- Custom shaders
- Particle systems
- Post-processing
- Dynamic lighting

#### Physics System
- Collision detection
- Projectile mechanics
- Character movement
- Environmental interactions
- Performance optimization

#### Asset Management
- Dynamic loading
- Resource pooling
- Memory management
- Cache optimization
- Asset streaming

This completes the detailed game design document for Cosmic Defender 3D, providing a comprehensive blueprint for development while maintaining flexibility for iteration and improvement during implementation.
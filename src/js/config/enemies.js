/**
 * Enemy configuration
 * Contains settings for different enemy types and formations
 */

// Enemy type configurations
export const ENEMY_TYPES = {
  // Drone - Fast but weak enemy that attacks in swarms
  drone: {
    health: 20,
    maxHealth: 20,
    damage: 5,
    moveSpeed: 5.0,
    turnSpeed: 3.0,
    scale: 0.8,
    color: 0x00aaff, // Blue
    points: 50,
    attackRange: 8,
    attackRate: 1.5, // Attacks per second
    detectionRange: 25,
    // Drone-specific properties
    swarmRadius: 3.0,
    swarmOffset: { x: 0, y: 0, z: 0 },
    swarmIndex: 0,
    swarmSize: 1
  },
  
  // Soldier - Balanced enemy with moderate health and damage
  soldier: {
    health: 50,
    maxHealth: 50,
    damage: 15,
    moveSpeed: 3.5,
    turnSpeed: 2.0,
    scale: 1.0,
    color: 0xff5500, // Orange
    points: 100,
    attackRange: 12,
    attackRate: 1.0, // Attacks per second
    detectionRange: 20,
    // Soldier-specific properties
    coverThreshold: 0.3, // Health percentage to seek cover
    burstCount: 3,      // Number of shots in burst
    burstInterval: 0.2  // Time between shots in burst
  },
  
  // Elite - Stronger enemy with special abilities
  elite: {
    health: 120,
    maxHealth: 120,
    damage: 25,
    moveSpeed: 4.0,
    turnSpeed: 2.5,
    scale: 1.2,
    color: 0xaa00ff, // Purple
    points: 250,
    attackRange: 15,
    attackRate: 0.8, // Attacks per second
    detectionRange: 25,
    // Elite-specific properties
    shieldStrength: 50,
    maxShieldStrength: 50,
    shieldRechargeRate: 5, // Per second
    shieldRechargeDelay: 3, // Seconds after damage
    specialAttackCooldown: 8, // Seconds
    teleportDistance: 10
  },
  
  // Commander - Powerful leader enemy that buffs nearby allies
  commander: {
    health: 200,
    maxHealth: 200,
    damage: 30,
    moveSpeed: 2.5,
    turnSpeed: 1.5,
    scale: 1.5,
    color: 0xff0000, // Red
    points: 500,
    attackRange: 18,
    attackRate: 0.5, // Attacks per second
    detectionRange: 30,
    // Commander-specific properties
    buffRadius: 10,
    buffStrength: 1.25, // 25% buff to allies
    summonCooldown: 15, // Seconds between summons
    summonCount: 3,     // Number of drones to summon
    minionTypes: ['drone']
  }
};

// Formation configurations
export const FORMATION_TYPES = {
  // Basic grid formation
  basic: {
    type: 'basic',
    spacing: 3.0,
    rows: 3,
    columns: 3,
    centerOffset: { x: 0, y: 0, z: 0 },
    rotationSpeed: 0.0,
    moveSpeed: 2.0,
    waveAmplitude: 0.0,
    waveFrequency: 1.0,
    enemyTypes: ['drone'],
    enemyTypeDistribution: {
      drone: 0.7,
      soldier: 0.2,
      elite: 0.1,
      commander: 0.0
    }
  },
  
  // Diamond formation
  diamond: {
    type: 'diamond',
    spacing: 2.5,
    layers: 3,
    rotationSpeed: 0.2,
    moveSpeed: 2.5,
    waveAmplitude: 0.3,
    waveFrequency: 0.8,
    enemyTypes: ['drone', 'soldier', 'elite'],
    enemyTypeDistribution: {
      drone: 0.6,
      soldier: 0.3,
      elite: 0.1,
      commander: 0.0
    }
  },
  
  // Pincer formation
  pincer: {
    type: 'pincer',
    spacing: 2.0,
    arms: 2,
    enemiesPerArm: 5,
    armAngle: 120, // Degrees
    rotationSpeed: 0.1,
    moveSpeed: 3.0,
    waveAmplitude: 0.2,
    waveFrequency: 1.2,
    enemyTypes: ['drone', 'soldier'],
    enemyTypeDistribution: {
      drone: 0.8,
      soldier: 0.2,
      elite: 0.0,
      commander: 0.0
    }
  },
  
  // Elite squad formation
  eliteSquad: {
    type: 'eliteSquad',
    spacing: 3.0,
    innerRadius: 3.0,
    outerRadius: 6.0,
    rotationSpeed: 0.15,
    moveSpeed: 2.0,
    waveAmplitude: 0.0,
    waveFrequency: 1.0,
    enemyTypes: ['elite', 'soldier', 'drone'],
    enemyTypeDistribution: {
      drone: 0.4,
      soldier: 0.3,
      elite: 0.2,
      commander: 0.1
    }
  }
};

// Wave configurations
export const WAVE_CONFIGS = [
  // Wave 1: Basic drones
  {
    formations: [
      {
        type: 'basic',
        count: 1,
        position: { x: 0, y: 0, z: -20 },
        enemyTypes: ['drone'],
        enemyTypeDistribution: {
          drone: 1.0,
          soldier: 0.0,
          elite: 0.0,
          commander: 0.0
        }
      }
    ],
    spawnDelay: 0,
    totalEnemies: 9,
    pointsMultiplier: 1.0
  },
  
  // Wave 2: Two drone formations
  {
    formations: [
      {
        type: 'basic',
        count: 1,
        position: { x: -10, y: 0, z: -20 },
        enemyTypes: ['drone'],
        enemyTypeDistribution: {
          drone: 1.0,
          soldier: 0.0,
          elite: 0.0,
          commander: 0.0
        }
      },
      {
        type: 'basic',
        count: 1,
        position: { x: 10, y: 0, z: -20 },
        enemyTypes: ['drone'],
        enemyTypeDistribution: {
          drone: 1.0,
          soldier: 0.0,
          elite: 0.0,
          commander: 0.0
        }
      }
    ],
    spawnDelay: 2,
    totalEnemies: 18,
    pointsMultiplier: 1.2
  },
  
  // Wave 3: Drones and soldiers
  {
    formations: [
      {
        type: 'diamond',
        count: 1,
        position: { x: 0, y: 0, z: -25 },
        enemyTypes: ['drone', 'soldier'],
        enemyTypeDistribution: {
          drone: 0.7,
          soldier: 0.3,
          elite: 0.0,
          commander: 0.0
        }
      }
    ],
    spawnDelay: 3,
    totalEnemies: 13,
    pointsMultiplier: 1.5
  },
  
  // Wave 4: Pincer attack
  {
    formations: [
      {
        type: 'pincer',
        count: 1,
        position: { x: 0, y: 0, z: -20 },
        enemyTypes: ['drone', 'soldier'],
        enemyTypeDistribution: {
          drone: 0.6,
          soldier: 0.4,
          elite: 0.0,
          commander: 0.0
        }
      }
    ],
    spawnDelay: 2,
    totalEnemies: 10,
    pointsMultiplier: 1.8
  },
  
  // Wave 5: Elite squad
  {
    formations: [
      {
        type: 'eliteSquad',
        count: 1,
        position: { x: 0, y: 0, z: -25 },
        enemyTypes: ['drone', 'soldier', 'elite'],
        enemyTypeDistribution: {
          drone: 0.5,
          soldier: 0.3,
          elite: 0.2,
          commander: 0.0
        }
      }
    ],
    spawnDelay: 5,
    totalEnemies: 15,
    pointsMultiplier: 2.0
  },
  
  // Wave 6: Multiple formations
  {
    formations: [
      {
        type: 'diamond',
        count: 1,
        position: { x: 0, y: 0, z: -30 },
        enemyTypes: ['drone', 'soldier', 'elite'],
        enemyTypeDistribution: {
          drone: 0.5,
          soldier: 0.3,
          elite: 0.2,
          commander: 0.0
        }
      },
      {
        type: 'basic',
        count: 2,
        position: { x: -15, y: 0, z: -20 },
        enemyTypes: ['drone', 'soldier'],
        enemyTypeDistribution: {
          drone: 0.7,
          soldier: 0.3,
          elite: 0.0,
          commander: 0.0
        }
      },
      {
        type: 'basic',
        count: 2,
        position: { x: 15, y: 0, z: -20 },
        enemyTypes: ['drone', 'soldier'],
        enemyTypeDistribution: {
          drone: 0.7,
          soldier: 0.3,
          elite: 0.0,
          commander: 0.0
        }
      }
    ],
    spawnDelay: 8,
    totalEnemies: 31,
    pointsMultiplier: 2.5
  },
  
  // Wave 7: Commander wave
  {
    formations: [
      {
        type: 'eliteSquad',
        count: 1,
        position: { x: 0, y: 0, z: -30 },
        enemyTypes: ['drone', 'soldier', 'elite', 'commander'],
        enemyTypeDistribution: {
          drone: 0.4,
          soldier: 0.3,
          elite: 0.2,
          commander: 0.1
        }
      }
    ],
    spawnDelay: 10,
    totalEnemies: 15,
    pointsMultiplier: 3.0
  }
];

// Difficulty scaling
export const DIFFICULTY_SCALING = {
  // Health scaling per wave
  healthMultiplier: 1.1,
  
  // Damage scaling per wave
  damageMultiplier: 1.05,
  
  // Speed scaling per wave
  speedMultiplier: 1.03,
  
  // Points scaling per wave
  pointsMultiplier: 1.2,
  
  // Enemy count scaling per wave
  enemyCountMultiplier: 1.1,
  
  // Elite and commander probability scaling per wave
  eliteProbabilityMultiplier: 1.2,
  commanderProbabilityMultiplier: 1.5
};

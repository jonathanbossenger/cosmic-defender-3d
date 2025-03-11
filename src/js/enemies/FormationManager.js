import * as THREE from 'three';
import { Formation } from './formations/Formation.js';
import { DiamondFormation } from './formations/DiamondFormation.js';
import { PincerFormation } from './formations/PincerFormation.js';
import { EliteSquadFormation } from './formations/EliteSquadFormation.js';
import { FORMATION_TYPES, WAVE_CONFIGS, DIFFICULTY_SCALING } from '../config/enemies.js';
import { Drone } from './types/Drone.js';
import { Soldier } from './types/Soldier.js';
import { Elite } from './types/Elite.js';
import { Commander } from './types/Commander.js';

/**
 * Manages enemy formations and waves
 */
export class FormationManager {
  constructor(scene, player, gameManager) {
    this.scene = scene;
    this.player = player;
    this.gameManager = gameManager;
    
    this.formations = [];
    this.activeFormations = [];
    this.currentWave = 0;
    this.waveInProgress = false;
    this.enemiesRemaining = 0;
    this.difficultyLevel = 1;
    
    // Enemy factory functions
    this.enemyFactories = {
      drone: (position, options) => new Drone(this.scene, position, options),
      soldier: (position, options) => new Soldier(this.scene, position, options),
      elite: (position, options) => new Elite(this.scene, position, options),
      commander: (position, options) => new Commander(this.scene, position, options)
    };
    
    // Formation factory functions
    this.formationFactories = {
      basic: (options) => new Formation(options),
      diamond: (options) => new DiamondFormation(options),
      pincer: (options) => new PincerFormation(options),
      eliteSquad: (options) => new EliteSquadFormation(options)
    };
  }
  
  /**
   * Initialize the formation manager
   */
  init() {
    // Any initialization logic
    console.log('Formation Manager initialized');
  }
  
  /**
   * Start a new wave
   * @param {number} waveNumber - Wave number to start (defaults to next wave)
   */
  startWave(waveNumber = null) {
    if (this.waveInProgress) {
      console.warn('Cannot start a new wave while one is in progress');
      return;
    }
    
    // If no wave number provided, use next wave
    if (waveNumber === null) {
      waveNumber = this.currentWave + 1;
    }
    
    // Check if wave exists in config
    if (waveNumber > WAVE_CONFIGS.length) {
      console.log('All waves completed!');
      this.gameManager.onAllWavesCompleted();
      return;
    }
    
    this.currentWave = waveNumber;
    this.waveInProgress = true;
    this.enemiesRemaining = 0;
    
    const waveConfig = WAVE_CONFIGS[waveNumber - 1];
    
    // Apply difficulty scaling
    const difficultyMultiplier = Math.pow(this.difficultyLevel, 0.5);
    
    // Create formations for this wave
    waveConfig.formations.forEach((formationConfig, index) => {
      setTimeout(() => {
        this.createFormation(formationConfig, difficultyMultiplier);
      }, index * 1000 + waveConfig.spawnDelay * 1000);
    });
    
    // Notify game manager
    this.gameManager.onWaveStarted(waveNumber);
    
    console.log(`Starting Wave ${waveNumber}`);
  }
  
  /**
   * Create a formation based on configuration
   * @param {Object} config - Formation configuration
   * @param {number} difficultyMultiplier - Difficulty scaling factor
   */
  createFormation(config, difficultyMultiplier = 1.0) {
    const formationType = config.type;
    const formationCount = config.count || 1;
    const basePosition = config.position || { x: 0, y: 0, z: -20 };
    
    // Get formation template from config
    const formationTemplate = FORMATION_TYPES[formationType];
    if (!formationTemplate) {
      console.error(`Unknown formation type: ${formationType}`);
      return;
    }
    
    // Create multiple formations if count > 1
    for (let i = 0; i < formationCount; i++) {
      // Calculate position offset for multiple formations
      const positionOffset = {
        x: (i - (formationCount - 1) / 2) * 20,
        y: 0,
        z: 0
      };
      
      const position = {
        x: basePosition.x + positionOffset.x,
        y: basePosition.y + positionOffset.y,
        z: basePosition.z + positionOffset.z
      };
      
      // Merge template with specific config
      const formationOptions = {
        ...formationTemplate,
        ...config,
        position: new THREE.Vector3(position.x, position.y, position.z)
      };
      
      // Create the formation
      const formation = this.createFormationInstance(formationOptions);
      
      // Generate positions for enemies
      formation.generatePositions();
      
      // Populate formation with enemies
      this.populateFormation(formation, formationOptions, difficultyMultiplier);
      
      // Add to active formations
      this.activeFormations.push(formation);
      this.formations.push(formation);
      
      // Activate the formation
      formation.activate();
    }
  }
  
  /**
   * Create a formation instance based on type
   * @param {Object} options - Formation options
   * @returns {Formation} The created formation
   */
  createFormationInstance(options) {
    const factory = this.formationFactories[options.type];
    if (!factory) {
      console.warn(`No factory for formation type: ${options.type}, using default`);
      return new Formation(options);
    }
    return factory(options);
  }
  
  /**
   * Populate a formation with enemies
   * @param {Formation} formation - The formation to populate
   * @param {Object} options - Formation options
   * @param {number} difficultyMultiplier - Difficulty scaling factor
   */
  populateFormation(formation, options, difficultyMultiplier) {
    const positions = formation.positions;
    const distribution = options.enemyTypeDistribution;
    const enemyTypes = options.enemyTypes || ['drone'];
    
    // Count enemies for tracking
    let enemyCount = 0;
    
    // Special handling for diamond formation with commander
    if (options.type === 'diamond' && distribution.commander > 0) {
      // Place commander at center
      const commanderPosition = positions[0];
      const commander = this.createEnemy('commander', commanderPosition, difficultyMultiplier);
      formation.addEnemy(commander, 0);
      enemyCount++;
      
      // Place elites in first layer
      const eliteIndices = formation.getEliteIndices();
      eliteIndices.forEach(index => {
        if (index < positions.length) {
          const elite = this.createEnemy('elite', positions[index], difficultyMultiplier);
          formation.addEnemy(elite, index);
          enemyCount++;
        }
      });
      
      // Place soldiers in second layer
      const soldierIndices = formation.getSoldierIndices();
      soldierIndices.forEach(index => {
        if (index < positions.length) {
          const soldier = this.createEnemy('soldier', positions[index], difficultyMultiplier);
          formation.addEnemy(soldier, index);
          enemyCount++;
        }
      });
      
      // Fill remaining positions with drones
      for (let i = 0; i < positions.length; i++) {
        if (!formation.enemies[i] && positions[i]) {
          const drone = this.createEnemy('drone', positions[i], difficultyMultiplier);
          formation.addEnemy(drone, i);
          enemyCount++;
        }
      }
    } 
    // Standard distribution for other formations
    else {
      positions.forEach((position, index) => {
        // Determine enemy type based on distribution
        const enemyType = this.getEnemyTypeFromDistribution(distribution);
        if (enemyType && position) {
          const enemy = this.createEnemy(enemyType, position, difficultyMultiplier);
          formation.addEnemy(enemy, index);
          enemyCount++;
        }
      });
    }
    
    // Update enemy count
    this.enemiesRemaining += enemyCount;
  }
  
  /**
   * Create an enemy of specified type
   * @param {string} type - Enemy type
   * @param {THREE.Vector3} position - Initial position
   * @param {number} difficultyMultiplier - Difficulty scaling factor
   * @returns {Enemy} The created enemy
   */
  createEnemy(type, position, difficultyMultiplier) {
    const factory = this.enemyFactories[type];
    if (!factory) {
      console.error(`Unknown enemy type: ${type}`);
      return null;
    }
    
    // Apply difficulty scaling to enemy options
    const options = {
      type: type,
      difficultyMultiplier: difficultyMultiplier,
      // Add any other options needed
    };
    
    const enemy = factory(position, options);
    
    // Set callback for when enemy is defeated
    enemy.onDefeated = () => this.onEnemyDefeated(enemy);
    
    return enemy;
  }
  
  /**
   * Get a random enemy type based on distribution
   * @param {Object} distribution - Probability distribution for enemy types
   * @returns {string} Selected enemy type
   */
  getEnemyTypeFromDistribution(distribution) {
    const random = Math.random();
    let cumulativeProbability = 0;
    
    for (const [type, probability] of Object.entries(distribution)) {
      cumulativeProbability += probability;
      if (random < cumulativeProbability) {
        return type;
      }
    }
    
    // Default to drone if no match (shouldn't happen with proper distribution)
    return 'drone';
  }
  
  /**
   * Handle enemy defeated event
   * @param {Enemy} enemy - The defeated enemy
   */
  onEnemyDefeated(enemy) {
    this.enemiesRemaining--;
    
    // Award points
    if (this.gameManager) {
      this.gameManager.addScore(enemy.points);
    }
    
    // Check if wave is complete
    if (this.enemiesRemaining <= 0 && this.waveInProgress) {
      this.waveInProgress = false;
      this.onWaveCompleted();
    }
  }
  
  /**
   * Handle wave completed event
   */
  onWaveCompleted() {
    console.log(`Wave ${this.currentWave} completed!`);
    
    // Clean up formations
    this.activeFormations = this.activeFormations.filter(formation => {
      if (formation.isDefeated()) {
        formation.deactivate();
        return false;
      }
      return true;
    });
    
    // Increase difficulty
    this.difficultyLevel += 0.5;
    
    // Notify game manager
    if (this.gameManager) {
      this.gameManager.onWaveCompleted(this.currentWave);
    }
    
    // Start next wave after delay
    if (this.currentWave < WAVE_CONFIGS.length) {
      setTimeout(() => {
        this.startWave();
      }, 5000); // 5 second delay between waves
    } else {
      // All waves completed
      if (this.gameManager) {
        this.gameManager.onAllWavesCompleted();
      }
    }
  }
  
  /**
   * Update all active formations
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    // Update all active formations
    this.activeFormations.forEach(formation => {
      formation.update(deltaTime, this.player.position);
    });
    
    // Check for defeated formations
    this.activeFormations = this.activeFormations.filter(formation => {
      if (formation.isDefeated()) {
        formation.deactivate();
        return false;
      }
      return true;
    });
  }
  
  /**
   * Reset the formation manager
   */
  reset() {
    // Clean up all formations
    this.formations.forEach(formation => {
      formation.deactivate();
    });
    
    this.formations = [];
    this.activeFormations = [];
    this.currentWave = 0;
    this.waveInProgress = false;
    this.enemiesRemaining = 0;
    this.difficultyLevel = 1;
  }
} 
import { DamageSystem } from './DamageSystem.js';
import { FeedbackSystem } from './FeedbackSystem.js';
import { ComboSystem } from './ComboSystem.js';
import { EventEmitter } from '../../utils/EventEmitter.js';

/**
 * CombatManager - Coordinates combat systems and handles interactions between them
 */
export class CombatManager {
  constructor(scene, camera, physics, audioManager) {
    this.scene = scene;
    this.camera = camera;
    this.physics = physics;
    this.audioManager = audioManager;
    this.events = new EventEmitter();
    
    // Create subsystems
    this.damageSystem = new DamageSystem(scene, physics);
    this.feedbackSystem = new FeedbackSystem(scene, camera, audioManager);
    this.comboSystem = new ComboSystem();
    
    // Player reference
    this.player = null;
    
    // Combat stats
    this.stats = {
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      criticalHits: 0,
      enemiesDefeated: 0,
      maxCombo: 0,
      accuracy: {
        shots: 0,
        hits: 0,
        percentage: 0
      }
    };
    
    // Settings
    this.settings = {
      friendlyFire: false,
      headshots: true,
      criticalHitMultiplier: 2.0,
      criticalHitChance: 0.1,
      damageNumbers: true,
      screenShake: true,
      hitMarkers: true,
      comboSystem: true
    };
    
    // Flags
    this.initialized = false;
  }
  
  /**
   * Initialize the combat manager and subsystems
   */
  init() {
    if (this.initialized) return;
    
    // Initialize subsystems
    this.damageSystem.init();
    this.feedbackSystem.init();
    
    if (this.settings.comboSystem) {
      this.comboSystem.init();
    }
    
    // Set up event listeners
    this.setupEventListeners();
    
    this.initialized = true;
    console.log('Combat Manager initialized');
  }
  
  /**
   * Set up event listeners between systems
   */
  setupEventListeners() {
    // Listen for hit events from damage system
    this.damageSystem.events.on('hit', this.onHit.bind(this));
    
    // Listen for area effect events from damage system
    this.damageSystem.events.on('areaEffect', this.onAreaEffect.bind(this));
    
    // Listen for shield impact events from damage system
    this.damageSystem.events.on('shieldImpact', this.onShieldImpact.bind(this));
    
    // Listen for combo events
    if (this.settings.comboSystem) {
      this.comboSystem.events.on('comboUpdated', this.onComboUpdated.bind(this));
      this.comboSystem.events.on('comboBroken', this.onComboBroken.bind(this));
      this.comboSystem.events.on('maxComboUpdated', this.onMaxComboUpdated.bind(this));
    }
  }
  
  /**
   * Set player reference
   * @param {Object} player - Player object
   */
  setPlayer(player) {
    this.player = player;
  }
  
  /**
   * Process a projectile hit
   * @param {Object} projectile - The projectile that hit
   * @param {Object} target - The target that was hit
   * @param {THREE.Vector3} hitPoint - The point of impact
   * @param {THREE.Vector3} hitNormal - The normal at the impact point
   */
  processHit(projectile, target, hitPoint, hitNormal) {
    // Skip if friendly fire is disabled and both are the same faction
    if (!this.settings.friendlyFire && 
        projectile.faction === target.faction) {
      return;
    }
    
    // Process hit in damage system
    this.damageSystem.processHit(projectile, target, hitPoint, hitNormal);
    
    // Update accuracy stats if player is the source
    if (projectile.source === 'player') {
      this.stats.accuracy.hits++;
    }
  }
  
  /**
   * Process a weapon shot (hit or miss)
   * @param {Object} weapon - The weapon that fired
   * @param {string} source - Source of the shot (player, enemy, etc.)
   */
  processShot(weapon, source) {
    // Update accuracy stats if player is the source
    if (source === 'player') {
      this.stats.accuracy.shots++;
      this.updateAccuracyStats();
    }
  }
  
  /**
   * Process an area effect attack
   * @param {THREE.Vector3} center - Center of the AOE
   * @param {number} radius - Radius of the AOE
   * @param {number} damage - Base damage amount
   * @param {string} damageType - Type of damage
   * @param {string} source - Source of the damage
   * @param {Array} excludeTargets - Targets to exclude from damage
   */
  processAreaEffect(center, radius, damage, damageType, source, excludeTargets = []) {
    this.damageSystem.processAreaEffect(
      center, radius, damage, damageType, source, excludeTargets
    );
  }
  
  /**
   * Process player damage
   * @param {number} damage - Amount of damage
   * @param {string} source - Source of the damage
   * @param {Object} data - Additional damage data
   */
  processPlayerDamage(damage, source, data = {}) {
    // Update stats
    this.stats.totalDamageTaken += damage;
    
    // Process in feedback system
    this.feedbackSystem.processPlayerDamage({
      damage,
      source,
      isCritical: data.isCritical || false,
      ...data
    });
    
    // Break combo if combo system is enabled
    if (this.settings.comboSystem) {
      this.comboSystem.onPlayerDamage({
        damage,
        source,
        ...data
      });
    }
    
    // Emit player damage event
    this.events.emit('playerDamage', {
      damage,
      source,
      ...data
    });
  }
  
  /**
   * Process enemy defeated
   * @param {Object} enemy - The defeated enemy
   * @param {string} source - Source that defeated the enemy
   */
  processEnemyDefeated(enemy, source) {
    // Update stats
    this.stats.enemiesDefeated++;
    
    // Emit enemy defeated event
    this.events.emit('enemyDefeated', {
      enemy,
      source
    });
  }
  
  /**
   * Handle hit event from damage system
   * @param {Object} hitData - Data about the hit
   */
  onHit(hitData) {
    const { projectile, target, damage, isCritical, hitPoint, hitNormal } = hitData;
    
    // Update stats
    if (projectile.source === 'player') {
      this.stats.totalDamageDealt += damage;
      if (isCritical) {
        this.stats.criticalHits++;
      }
    }
    
    // Process in feedback system
    this.feedbackSystem.processHit(hitData);
    
    // Update combo if player hit an enemy
    if (this.settings.comboSystem && projectile.source === 'player' && target.faction !== 'player') {
      this.comboSystem.registerHit({
        damage,
        isCritical,
        target
      });
    }
    
    // Emit hit event
    this.events.emit('hit', hitData);
  }
  
  /**
   * Handle area effect event from damage system
   * @param {Object} areaData - Data about the area effect
   */
  onAreaEffect(areaData) {
    // Update stats for player-caused area effects
    if (areaData.source === 'player') {
      // Sum damage dealt to all targets
      const totalDamage = areaData.targets.reduce((sum, target) => {
        // This is an approximation since we don't have the exact damage per target here
        return sum + areaData.damage;
      }, 0);
      
      this.stats.totalDamageDealt += totalDamage;
    }
    
    // Emit area effect event
    this.events.emit('areaEffect', areaData);
  }
  
  /**
   * Handle shield impact event from damage system
   * @param {Object} shieldData - Data about the shield impact
   */
  onShieldImpact(shieldData) {
    // Emit shield impact event
    this.events.emit('shieldImpact', shieldData);
  }
  
  /**
   * Handle combo updated event from combo system
   * @param {Object} comboData - Data about the combo
   */
  onComboUpdated(comboData) {
    // Emit combo updated event
    this.events.emit('comboUpdated', comboData);
  }
  
  /**
   * Handle combo broken event from combo system
   * @param {Object} comboData - Data about the broken combo
   */
  onComboBroken(comboData) {
    // Emit combo broken event
    this.events.emit('comboBroken', comboData);
  }
  
  /**
   * Handle max combo updated event from combo system
   * @param {number} maxCombo - New max combo
   */
  onMaxComboUpdated(maxCombo) {
    this.stats.maxCombo = maxCombo;
    
    // Emit max combo updated event
    this.events.emit('maxComboUpdated', maxCombo);
  }
  
  /**
   * Update accuracy statistics
   */
  updateAccuracyStats() {
    if (this.stats.accuracy.shots > 0) {
      this.stats.accuracy.percentage = 
        (this.stats.accuracy.hits / this.stats.accuracy.shots) * 100;
    } else {
      this.stats.accuracy.percentage = 0;
    }
  }
  
  /**
   * Get current combat statistics
   * @returns {Object} Combat statistics
   */
  getStats() {
    return { ...this.stats };
  }
  
  /**
   * Get current combo multiplier
   * @returns {number} Current combo multiplier
   */
  getComboMultiplier() {
    if (!this.settings.comboSystem) return 1.0;
    return this.comboSystem.getComboMultiplier();
  }
  
  /**
   * Get current score bonus from combo
   * @returns {number} Score bonus multiplier
   */
  getScoreBonus() {
    if (!this.settings.comboSystem) return 0;
    return this.comboSystem.getScoreBonus();
  }
  
  /**
   * Get current damage bonus from combo
   * @returns {number} Damage bonus multiplier
   */
  getDamageBonus() {
    if (!this.settings.comboSystem) return 0;
    return this.comboSystem.getDamageBonus();
  }
  
  /**
   * Update the combat manager and subsystems
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    // Update subsystems
    this.damageSystem.update(deltaTime);
    this.feedbackSystem.update(deltaTime);
    
    if (this.settings.comboSystem) {
      this.comboSystem.update(deltaTime);
    }
  }
  
  /**
   * Apply settings to combat manager and subsystems
   * @param {Object} newSettings - New settings to apply
   */
  applySettings(newSettings) {
    // Update local settings
    this.settings = { ...this.settings, ...newSettings };
    
    // Apply to damage system
    this.damageSystem.setCriticalHitParams(
      this.settings.criticalHitChance,
      this.settings.criticalHitMultiplier
    );
    
    this.damageSystem.setDebugEnabled(this.settings.damageNumbers);
    
    // Apply to combo system
    if (this.settings.comboSystem) {
      this.comboSystem.setActive(true);
    } else {
      this.comboSystem.setActive(false);
    }
  }
  
  /**
   * Reset combat statistics
   */
  resetStats() {
    this.stats = {
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      criticalHits: 0,
      enemiesDefeated: 0,
      maxCombo: 0,
      accuracy: {
        shots: 0,
        hits: 0,
        percentage: 0
      }
    };
    
    // Reset combo system
    if (this.settings.comboSystem) {
      this.comboSystem.reset();
    }
  }
  
  /**
   * Dispose of resources
   */
  dispose() {
    // Dispose of subsystems
    this.damageSystem.dispose();
    this.feedbackSystem.dispose();
    
    if (this.settings.comboSystem) {
      this.comboSystem.dispose();
    }
    
    // Remove all event listeners
    this.events.removeAllListeners();
    this.damageSystem.events.removeAllListeners();
    
    if (this.settings.comboSystem) {
      this.comboSystem.events.removeAllListeners();
    }
    
    // Reset flags
    this.initialized = false;
  }
} 
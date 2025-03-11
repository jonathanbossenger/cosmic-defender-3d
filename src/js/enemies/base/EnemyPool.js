import { PoolManager } from '../../utils/pool.js';
import { Enemy } from './Enemy.js';
import * as THREE from 'three';

/**
 * Pool manager for enemy instances
 */
export class EnemyPool {
  /**
   * Create a new enemy pool
   * @param {THREE.Scene} scene - The scene to add enemies to
   * @param {Object} physics - The physics world
   */
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;
    
    // Create pools for each enemy type
    this.pools = {
      drone: this.createPool('drone'),
      soldier: this.createPool('soldier'),
      elite: this.createPool('elite'),
      commander: this.createPool('commander')
    };
    
    // Active enemies
    this.activeEnemies = new Set();
  }
  
  /**
   * Create a pool for a specific enemy type
   * @param {string} type - Enemy type
   * @returns {PoolManager} The pool manager
   */
  createPool(type) {
    return new PoolManager(
      // Create function
      () => {
        const options = { type };
        return new Enemy(this.scene, this.physics, options);
      },
      // Reset function
      (enemy) => {
        enemy.deactivate();
      },
      // Initial size
      10
    );
  }
  
  /**
   * Spawn an enemy
   * @param {string} type - Enemy type
   * @param {THREE.Vector3} position - Spawn position
   * @param {Object} options - Additional options
   * @returns {Enemy} The spawned enemy
   */
  spawn(type, position, options = {}) {
    // Get pool for type
    const pool = this.pools[type];
    if (!pool) {
      console.error(`Enemy type "${type}" not found`);
      return null;
    }
    
    // Get enemy from pool
    const enemy = pool.get();
    
    // Set options
    Object.assign(enemy.options, options);
    
    // Activate enemy
    enemy.activate(position);
    
    // Add to active enemies
    this.activeEnemies.add(enemy);
    
    return enemy;
  }
  
  /**
   * Despawn an enemy
   * @param {Enemy} enemy - The enemy to despawn
   */
  despawn(enemy) {
    if (!enemy) return;
    
    // Remove from active enemies
    this.activeEnemies.delete(enemy);
    
    // Get pool for type
    const pool = this.pools[enemy.options.type];
    if (!pool) {
      console.error(`Enemy type "${enemy.options.type}" not found`);
      return;
    }
    
    // Return to pool
    pool.release(enemy);
  }
  
  /**
   * Despawn all enemies
   */
  despawnAll() {
    // Copy active enemies to array to avoid modification during iteration
    const enemies = Array.from(this.activeEnemies);
    
    // Despawn each enemy
    enemies.forEach(enemy => this.despawn(enemy));
    
    // Clear active enemies
    this.activeEnemies.clear();
  }
  
  /**
   * Update all active enemies
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    this.activeEnemies.forEach(enemy => {
      enemy.update(deltaTime);
    });
  }
  
  /**
   * Set target for all active enemies
   * @param {Object} target - Target object (usually the player)
   */
  setTarget(target) {
    this.activeEnemies.forEach(enemy => {
      enemy.setTarget(target);
    });
  }
  
  /**
   * Get all active enemies
   * @returns {Array<Enemy>} Array of active enemies
   */
  getActiveEnemies() {
    return Array.from(this.activeEnemies);
  }
  
  /**
   * Get count of active enemies
   * @returns {number} Number of active enemies
   */
  getActiveCount() {
    return this.activeEnemies.size;
  }
  
  /**
   * Get count of active enemies by type
   * @param {string} type - Enemy type
   * @returns {number} Number of active enemies of the specified type
   */
  getActiveCountByType(type) {
    let count = 0;
    this.activeEnemies.forEach(enemy => {
      if (enemy.options.type === type) {
        count++;
      }
    });
    return count;
  }
  
  /**
   * Dispose all enemies and pools
   */
  dispose() {
    // Despawn all active enemies
    this.despawnAll();
    
    // Dispose all enemies in pools
    for (const type in this.pools) {
      const pool = this.pools[type];
      
      // Get all objects from pool
      const objects = pool.getActiveObjects().concat(
        Array(pool.getAvailableCount()).fill().map(() => pool.get())
      );
      
      // Dispose each object
      objects.forEach(enemy => {
        enemy.dispose();
      });
    }
    
    // Clear pools
    this.pools = {};
  }
} 
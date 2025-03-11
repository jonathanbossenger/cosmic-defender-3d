import { Projectile } from './Projectile.js';
import { PoolManager } from '../utils/pool.js';

export class ProjectilePool {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;
    
    // Create pool manager
    this.pool = new PoolManager(
      // Create function
      () => new Projectile(this.scene, this.physics),
      // Reset function
      (projectile) => projectile.reset()
    );
    
    // Active projectiles
    this.activeProjectiles = [];
    
    // Initialize pool with some projectiles
    this.initialize(20);
  }
  
  initialize(count) {
    this.pool.ensureCapacity(count);
  }
  
  getProjectile() {
    // Get projectile from pool
    const projectile = this.pool.get();
    
    // Add to active projectiles
    this.activeProjectiles.push(projectile);
    
    return projectile;
  }
  
  releaseProjectile(projectile) {
    // Remove from active projectiles
    const index = this.activeProjectiles.indexOf(projectile);
    if (index !== -1) {
      this.activeProjectiles.splice(index, 1);
    }
    
    // Return to pool
    this.pool.release(projectile);
  }
  
  fireProjectile(position, direction, config = {}) {
    // Get projectile
    const projectile = this.getProjectile();
    
    // Fire projectile
    projectile.fire(position, direction, config);
    
    return projectile;
  }
  
  update(deltaTime) {
    // Update all active projectiles
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const projectile = this.activeProjectiles[i];
      
      // Update projectile
      projectile.update(deltaTime);
      
      // If projectile is no longer active, release it
      if (!projectile.active) {
        this.releaseProjectile(projectile);
      }
    }
  }
  
  getActiveCount() {
    return this.activeProjectiles.length;
  }
  
  getPoolSize() {
    return this.pool.getAvailableCount() + this.activeProjectiles.length;
  }
  
  clear() {
    // Release all active projectiles
    while (this.activeProjectiles.length > 0) {
      const projectile = this.activeProjectiles[0];
      projectile.deactivate();
      this.releaseProjectile(projectile);
    }
  }
} 

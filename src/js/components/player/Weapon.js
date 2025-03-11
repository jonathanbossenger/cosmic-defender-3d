import * as THREE from 'three';
import { Projectile } from '../../weapons/Projectile.js';
import { PoolManager } from '../../utils/pool.js';

export class Weapon {
  constructor(scene, camera, physics, player) {
    this.scene = scene;
    this.camera = camera;
    this.physics = physics;
    this.player = player;
    
    // Weapon properties
    this.type = 'pulse_cannon'; // Default weapon
    this.damage = 10;
    this.fireRate = 2; // shots per second
    this.projectileSpeed = 30; // meters per second
    this.magazineSize = 20;
    this.currentAmmo = this.magazineSize;
    this.reloadTime = 1.5; // seconds
    this.spread = 0.02; // bullet spread
    
    // Weapon state
    this.isReloading = false;
    this.lastFireTime = 0;
    this.reloadStartTime = 0;
    
    // Weapon model
    this.createWeaponModel();
    
    // Projectile pool
    this.setupProjectilePool();
    
    // Upgrade paths
    this.upgrades = {
      precision: 0, // 0-3 levels
      rapidFire: 0, // 0-3 levels
      impact: 0     // 0-3 levels
    };
    
    // Audio
    this.sounds = {
      fire: null,
      reload: null,
      empty: null
    };
    
    // Event listeners
    this.setupEventListeners();
  }
  
  createWeaponModel() {
    // Create a simple weapon model
    const group = new THREE.Group();
    
    // Main body
    const bodyGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.4);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.5,
      metalness: 0.7
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.z = -0.2;
    group.add(body);
    
    // Barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8);
    const barrelMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.3,
      metalness: 0.8
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.4;
    group.add(barrel);
    
    // Energy core
    const coreGeometry = new THREE.SphereGeometry(0.04, 16, 16);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      roughness: 0.2,
      metalness: 0.5,
      emissive: 0x0044ff,
      emissiveIntensity: 0.5
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.y = 0.06;
    core.position.z = -0.15;
    group.add(core);
    
    // Position the weapon model
    group.position.set(0.2, -0.15, -0.3);
    
    // Add to camera
    this.model = group;
    this.camera.add(this.model);
    
    // Muzzle flash
    const flashGeometry = new THREE.CircleGeometry(0.05, 16);
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.muzzleFlash = new THREE.Mesh(flashGeometry, flashMaterial);
    this.muzzleFlash.position.set(0, 0, -0.6);
    this.muzzleFlash.rotation.y = Math.PI / 2;
    group.add(this.muzzleFlash);
  }
  
  setupProjectilePool() {
    // Create projectile pool
    this.projectilePool = new PoolManager(
      // Create function
      () => new Projectile(this.scene, this.physics),
      // Reset function
      (projectile) => projectile.reset()
    );
    
    // Pre-populate pool with projectiles
    this.projectilePool.ensureCapacity(20);
  }
  
  setupEventListeners() {
    // Mouse click for firing
    document.addEventListener('mousedown', (event) => {
      if (event.button === 0) { // Left mouse button
        this.startFiring();
      }
    });
    
    document.addEventListener('mouseup', (event) => {
      if (event.button === 0) { // Left mouse button
        this.stopFiring();
      }
    });
    
    // Reload key
    document.addEventListener('keydown', (event) => {
      if (event.code === 'KeyR') {
        this.reload();
      }
    });
  }
  
  startFiring() {
    this.isFiring = true;
  }
  
  stopFiring() {
    this.isFiring = false;
  }
  
  fire() {
    // Check if can fire
    const now = performance.now() / 1000;
    if (this.isReloading || now - this.lastFireTime < 1 / this.fireRate) {
      return false;
    }
    
    // Check ammo
    if (this.currentAmmo <= 0) {
      this.playEmptySound();
      this.reload();
      return false;
    }
    
    // Update fire time
    this.lastFireTime = now;
    
    // Decrease ammo
    this.currentAmmo--;
    
    // Get projectile from pool
    const projectile = this.projectilePool.get();
    
    // Calculate projectile direction with spread
    const direction = this.camera.getWorldDirection(new THREE.Vector3());
    
    // Apply spread
    if (this.spread > 0) {
      const spreadX = (Math.random() - 0.5) * this.spread;
      const spreadY = (Math.random() - 0.5) * this.spread;
      direction.x += spreadX;
      direction.y += spreadY;
      direction.normalize();
    }
    
    // Set projectile properties based on weapon type and upgrades
    let projectileConfig = {
      damage: this.damage,
      speed: this.projectileSpeed,
      radius: 0.05,
      color: 0x00aaff,
      lifetime: 3.0,
      piercing: false,
      explosive: false,
      explosionRadius: 0
    };
    
    // Apply upgrades
    if (this.upgrades.precision > 0) {
      projectileConfig.damage *= (1 + this.upgrades.precision * 0.2); // +20% damage per level
      projectileConfig.speed *= (1 + this.upgrades.precision * 0.1); // +10% speed per level
      
      if (this.upgrades.precision >= 3) {
        projectileConfig.piercing = true; // Level 3 precision enables piercing
      }
    }
    
    if (this.upgrades.impact > 0) {
      projectileConfig.damage *= (1 + this.upgrades.impact * 0.3); // +30% damage per level
      projectileConfig.radius *= (1 + this.upgrades.impact * 0.2); // +20% size per level
      
      if (this.upgrades.impact >= 2) {
        projectileConfig.explosive = true; // Level 2 impact enables explosions
        projectileConfig.explosionRadius = 1.0 + (this.upgrades.impact - 2) * 0.5; // Explosion radius
      }
    }
    
    // Get muzzle position in world space
    const muzzlePosition = new THREE.Vector3();
    this.muzzleFlash.getWorldPosition(muzzlePosition);
    
    // Fire projectile
    projectile.fire(muzzlePosition, direction, projectileConfig);
    
    // Visual effects
    this.showMuzzleFlash();
    
    // Play sound
    this.playFireSound();
    
    // Apply recoil
    this.applyRecoil();
    
    // Auto reload if empty
    if (this.currentAmmo <= 0) {
      this.reload();
    }
    
    return true;
  }
  
  reload() {
    if (this.isReloading || this.currentAmmo === this.magazineSize) return;
    
    this.isReloading = true;
    this.reloadStartTime = performance.now() / 1000;
    
    // Play reload sound
    this.playReloadSound();
    
    // Reload animation
    this.model.rotation.x = 0.3; // Tilt weapon down
  }
  
  finishReload() {
    this.currentAmmo = this.magazineSize;
    this.isReloading = false;
    
    // Reset weapon position
    this.model.rotation.x = 0;
  }
  
  showMuzzleFlash() {
    // Show muzzle flash
    this.muzzleFlash.material.opacity = 1;
    
    // Hide after a short time
    setTimeout(() => {
      this.muzzleFlash.material.opacity = 0;
    }, 50);
  }
  
  applyRecoil() {
    // Apply recoil to weapon model
    this.model.position.z += 0.05;
    this.model.rotation.x -= 0.05;
    
    // Reset position after a short time
    setTimeout(() => {
      this.model.position.z = -0.3;
      this.model.rotation.x = 0;
    }, 100);
  }
  
  playFireSound() {
    // Play fire sound (would be implemented with audio system)
    console.log('Weapon fired');
  }
  
  playReloadSound() {
    // Play reload sound (would be implemented with audio system)
    console.log('Reloading weapon');
  }
  
  playEmptySound() {
    // Play empty magazine sound (would be implemented with audio system)
    console.log('Weapon empty');
  }
  
  upgradeWeapon(path, level) {
    if (level < 0 || level > 3) return false;
    
    switch (path) {
      case 'precision':
        this.upgrades.precision = level;
        this.spread = Math.max(0.02 - level * 0.005, 0); // Reduce spread
        break;
        
      case 'rapidFire':
        this.upgrades.rapidFire = level;
        this.fireRate = 2 + level * 1; // +1 fire rate per level
        this.magazineSize = 20 + level * 10; // +10 ammo per level
        this.reloadTime = Math.max(1.5 - level * 0.2, 0.8); // Reduce reload time
        break;
        
      case 'impact':
        this.upgrades.impact = level;
        this.damage = 10 + level * 5; // +5 damage per level
        break;
        
      default:
        return false;
    }
    
    return true;
  }
  
  update(deltaTime) {
    // Handle firing
    if (this.isFiring && !this.isReloading) {
      this.fire();
    }
    
    // Handle reloading
    if (this.isReloading) {
      const now = performance.now() / 1000;
      if (now - this.reloadStartTime >= this.reloadTime) {
        this.finishReload();
      }
    }
    
    // Weapon bob effect when moving
    if (this.player.moveDirection.lengthSq() > 0) {
      const bobAmount = 0.02;
      const bobSpeed = 5;
      const bobX = Math.sin(performance.now() / 1000 * bobSpeed) * bobAmount;
      const bobY = Math.abs(Math.sin(performance.now() / 1000 * bobSpeed * 2)) * bobAmount;
      
      this.model.position.y = -0.15 + bobY;
      this.model.position.x = 0.2 + bobX;
    } else {
      // Reset position when not moving
      this.model.position.y = -0.15;
      this.model.position.x = 0.2;
    }
  }
  
  getAmmoStatus() {
    return {
      current: this.currentAmmo,
      max: this.magazineSize,
      percentage: this.currentAmmo / this.magazineSize,
      isReloading: this.isReloading
    };
  }
} 

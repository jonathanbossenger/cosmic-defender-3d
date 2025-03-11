import * as THREE from 'three';
import { Cover } from './Cover.js';

/**
 * CoverSystem - Manages all cover objects in the arena
 */
export class CoverSystem {
  /**
   * Create a new cover system
   * @param {THREE.Scene} scene - The scene to add covers to
   * @param {Object} physics - The physics world
   * @param {Object} options - Cover system options
   */
  constructor(scene, physics, options = {}) {
    this.scene = scene;
    this.physics = physics;
    
    // Default options
    this.options = Object.assign({
      barrierCount: 8,
      shieldStationCount: 2,
      ammoStationCount: 2,
      platformSize: 60,
      platformHeight: 2,
      coverMargin: 5, // Margin from platform edge
    }, options);
    
    // Cover objects
    this.covers = [];
    this.barriers = [];
    this.shieldStations = [];
    this.ammoStations = [];
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the cover system
   */
  init() {
    // Create barriers
    this.createBarriers();
    
    // Create shield stations
    this.createShieldStations();
    
    // Create ammo stations
    this.createAmmoStations();
  }
  
  /**
   * Create defensive barriers
   */
  createBarriers() {
    const { barrierCount, platformSize, platformHeight, coverMargin } = this.options;
    
    // Calculate positions for barriers
    const positions = this.calculateBarrierPositions(barrierCount, platformSize, coverMargin);
    
    // Create barriers
    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];
      
      // Create barrier
      const barrier = new Cover(this.scene, this.physics, {
        type: 'barrier',
        position: new THREE.Vector3(position.x, platformHeight + 0.75, position.z),
        rotation: new THREE.Euler(0, position.rotation, 0),
        width: 3 + Math.random() * 2, // Random width between 3-5
        height: 1.5,
        depth: 0.3,
        color: 0x888888,
        health: 100,
        maxHealth: 100,
        destructible: true,
        respawnTime: 30,
      });
      
      // Add to arrays
      this.covers.push(barrier);
      this.barriers.push(barrier);
    }
  }
  
  /**
   * Calculate positions for barriers
   * @param {number} count - Number of barriers
   * @param {number} platformSize - Size of the platform
   * @param {number} margin - Margin from platform edge
   * @returns {Array} - Array of positions
   */
  calculateBarrierPositions(count, platformSize, margin) {
    const positions = [];
    const radius = (platformSize / 2) - margin;
    const angleStep = (Math.PI * 2) / count;
    
    // Create barriers in a circle
    for (let i = 0; i < count; i++) {
      const angle = angleStep * i;
      
      // Calculate position
      const x = Math.sin(angle) * radius * 0.7; // 70% of radius for inner ring
      const z = Math.cos(angle) * radius * 0.7;
      
      // Add position
      positions.push({
        x,
        z,
        rotation: angle + Math.PI / 2, // Rotate to face outward
      });
    }
    
    return positions;
  }
  
  /**
   * Create shield stations
   */
  createShieldStations() {
    const { shieldStationCount, platformSize, platformHeight, coverMargin } = this.options;
    
    // Calculate positions for shield stations
    const positions = this.calculateStationPositions(shieldStationCount, platformSize, coverMargin, 0);
    
    // Create shield stations
    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];
      
      // Create shield station
      const shieldStation = new Cover(this.scene, this.physics, {
        type: 'shield-station',
        position: new THREE.Vector3(position.x, platformHeight, position.z),
        rotation: new THREE.Euler(0, position.rotation, 0),
        width: 2,
        height: 2,
        depth: 2,
        color: 0x0088ff,
        health: 150,
        maxHealth: 150,
        destructible: true,
        respawnTime: 45,
      });
      
      // Add to arrays
      this.covers.push(shieldStation);
      this.shieldStations.push(shieldStation);
    }
  }
  
  /**
   * Create ammo stations
   */
  createAmmoStations() {
    const { ammoStationCount, platformSize, platformHeight, coverMargin } = this.options;
    
    // Calculate positions for ammo stations
    const positions = this.calculateStationPositions(ammoStationCount, platformSize, coverMargin, Math.PI);
    
    // Create ammo stations
    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];
      
      // Create ammo station
      const ammoStation = new Cover(this.scene, this.physics, {
        type: 'ammo-station',
        position: new THREE.Vector3(position.x, platformHeight, position.z),
        rotation: new THREE.Euler(0, position.rotation, 0),
        width: 2,
        height: 2,
        depth: 2,
        color: 0xff8800,
        health: 150,
        maxHealth: 150,
        destructible: true,
        respawnTime: 45,
      });
      
      // Add to arrays
      this.covers.push(ammoStation);
      this.ammoStations.push(ammoStation);
    }
  }
  
  /**
   * Calculate positions for stations
   * @param {number} count - Number of stations
   * @param {number} platformSize - Size of the platform
   * @param {number} margin - Margin from platform edge
   * @param {number} offsetAngle - Angle offset
   * @returns {Array} - Array of positions
   */
  calculateStationPositions(count, platformSize, margin, offsetAngle) {
    const positions = [];
    const radius = (platformSize / 2) - margin * 2;
    const angleStep = (Math.PI) / (count + 1); // Half circle
    
    // Create stations in a half circle
    for (let i = 1; i <= count; i++) {
      const angle = angleStep * i + offsetAngle;
      
      // Calculate position
      const x = Math.sin(angle) * radius * 0.4; // 40% of radius for inner placement
      const z = Math.cos(angle) * radius * 0.4;
      
      // Add position
      positions.push({
        x,
        z,
        rotation: angle + Math.PI / 2, // Rotate to face outward
      });
    }
    
    return positions;
  }
  
  /**
   * Get all covers
   * @returns {Array} - Array of all covers
   */
  getAllCovers() {
    return this.covers;
  }
  
  /**
   * Get barriers
   * @returns {Array} - Array of barriers
   */
  getBarriers() {
    return this.barriers;
  }
  
  /**
   * Get shield stations
   * @returns {Array} - Array of shield stations
   */
  getShieldStations() {
    return this.shieldStations;
  }
  
  /**
   * Get ammo stations
   * @returns {Array} - Array of ammo stations
   */
  getAmmoStations() {
    return this.ammoStations;
  }
  
  /**
   * Get nearest cover to a position
   * @param {THREE.Vector3} position - Position to find nearest cover to
   * @param {string} type - Type of cover to find (optional)
   * @returns {Object} - Nearest cover
   */
  getNearestCover(position, type = null) {
    let nearest = null;
    let nearestDistance = Infinity;
    
    // Filter covers by type if specified
    const coversToCheck = type ? 
      this.covers.filter(cover => cover.type === type) : 
      this.covers;
    
    // Find nearest cover
    for (const cover of coversToCheck) {
      if (cover.isDestroyed) continue;
      
      const distance = position.distanceTo(cover.position);
      
      if (distance < nearestDistance) {
        nearest = cover;
        nearestDistance = distance;
      }
    }
    
    return nearest;
  }
  
  /**
   * Check if a position is behind cover relative to another position
   * @param {THREE.Vector3} position - Position to check
   * @param {THREE.Vector3} relativePosition - Position to check relative to
   * @returns {boolean} - Whether position is behind cover
   */
  isPositionBehindCover(position, relativePosition) {
    // Direction from relative position to position
    const direction = new THREE.Vector3()
      .subVectors(position, relativePosition)
      .normalize();
    
    // Ray from relative position towards position
    const raycaster = new THREE.Raycaster(
      relativePosition.clone(),
      direction,
      0,
      position.distanceTo(relativePosition)
    );
    
    // Get all cover meshes
    const coverMeshes = this.covers
      .filter(cover => !cover.isDestroyed)
      .map(cover => cover.mesh);
    
    // Check for intersections
    const intersections = raycaster.intersectObjects(coverMeshes, true);
    
    return intersections.length > 0;
  }
  
  /**
   * Find cover position relative to a target
   * @param {THREE.Vector3} position - Starting position
   * @param {THREE.Vector3} targetPosition - Target position to take cover from
   * @param {number} maxDistance - Maximum distance to search
   * @returns {THREE.Vector3|null} - Cover position or null if none found
   */
  findCoverPosition(position, targetPosition, maxDistance = 15) {
    // Get all non-destroyed covers
    const availableCovers = this.covers.filter(cover => !cover.isDestroyed);
    
    // Sort covers by distance
    availableCovers.sort((a, b) => {
      const distA = position.distanceTo(a.position);
      const distB = position.distanceTo(b.position);
      return distA - distB;
    });
    
    // Check each cover
    for (const cover of availableCovers) {
      // Skip if too far
      if (position.distanceTo(cover.position) > maxDistance) {
        continue;
      }
      
      // Direction from target to cover
      const directionFromTarget = new THREE.Vector3()
        .subVectors(cover.position, targetPosition)
        .normalize();
      
      // Position behind cover (opposite side from target)
      const behindCoverPosition = new THREE.Vector3()
        .copy(cover.position)
        .add(directionFromTarget.multiplyScalar(cover.width / 2 + 1));
      
      // Check if this position is actually behind cover
      if (this.isPositionBehindCover(behindCoverPosition, targetPosition)) {
        return behindCoverPosition;
      }
    }
    
    return null;
  }
  
  /**
   * Update all covers
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    for (const cover of this.covers) {
      cover.update(deltaTime);
    }
  }
  
  /**
   * Dispose of all covers
   */
  dispose() {
    for (const cover of this.covers) {
      cover.dispose();
    }
    
    this.covers = [];
    this.barriers = [];
    this.shieldStations = [];
    this.ammoStations = [];
  }
} 
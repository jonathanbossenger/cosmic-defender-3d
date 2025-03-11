import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export class Collisions {
  constructor(physicsWorld) {
    this.physicsWorld = physicsWorld;
    this.collisionPairs = new Map();
    this.collisionCallbacks = new Map();
    
    // Set up collision event listener
    this.setupCollisionEvents();
  }
  
  setupCollisionEvents() {
    // Listen for collision events in the physics world
    this.physicsWorld.world.addEventListener('beginContact', (event) => {
      this.handleCollision(event.bodyA, event.bodyB, 'begin');
    });
    
    this.physicsWorld.world.addEventListener('endContact', (event) => {
      this.handleCollision(event.bodyA, event.bodyB, 'end');
    });
  }
  
  handleCollision(bodyA, bodyB, type) {
    // Get the collision pair key
    const pairKey1 = `${bodyA.id}-${bodyB.id}`;
    const pairKey2 = `${bodyB.id}-${bodyA.id}`;
    
    // Check if we have callbacks for this pair
    if (this.collisionCallbacks.has(pairKey1)) {
      const callback = this.collisionCallbacks.get(pairKey1);
      callback(bodyA, bodyB, type);
    } else if (this.collisionCallbacks.has(pairKey2)) {
      const callback = this.collisionCallbacks.get(pairKey2);
      callback(bodyB, bodyA, type);
    }
  }
  
  addCollisionPair(bodyA, bodyB, callback) {
    const pairKey = `${bodyA.id}-${bodyB.id}`;
    this.collisionPairs.set(pairKey, { bodyA, bodyB });
    this.collisionCallbacks.set(pairKey, callback);
  }
  
  removeCollisionPair(bodyA, bodyB) {
    const pairKey = `${bodyA.id}-${bodyB.id}`;
    this.collisionPairs.delete(pairKey);
    this.collisionCallbacks.delete(pairKey);
  }
  
  // Ray casting for hit detection
  raycast(origin, direction, maxDistance = 100, filterFunc = null) {
    // Convert Three.js vectors to CANNON vectors
    const rayFromWorld = new CANNON.Vec3(origin.x, origin.y, origin.z);
    const rayToWorld = new CANNON.Vec3(
      origin.x + direction.x * maxDistance,
      origin.y + direction.y * maxDistance,
      origin.z + direction.z * maxDistance
    );
    
    // Perform raycast
    const result = new CANNON.RaycastResult();
    this.physicsWorld.world.raycastClosest(
      rayFromWorld,
      rayToWorld,
      {
        skipBackfaces: true,
        collisionFilterMask: -1,
        collisionFilterGroup: -1,
      },
      result
    );
    
    // If we hit something and there's a filter function, check if it passes
    if (result.hasHit && filterFunc && !filterFunc(result.body)) {
      return null;
    }
    
    return result.hasHit ? {
      body: result.body,
      point: new THREE.Vector3(result.hitPointWorld.x, result.hitPointWorld.y, result.hitPointWorld.z),
      normal: new THREE.Vector3(result.hitNormalWorld.x, result.hitNormalWorld.y, result.hitNormalWorld.z),
      distance: result.distance
    } : null;
  }
}

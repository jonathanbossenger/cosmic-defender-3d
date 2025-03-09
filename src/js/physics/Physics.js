import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export class Physics {
  constructor() {
    // Create physics world
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0), // Earth gravity
    });
    
    // Set solver iterations
    this.world.solver.iterations = 10;
    
    // Set contact material properties
    this.defaultMaterial = new CANNON.Material('default');
    const defaultContactMaterial = new CANNON.ContactMaterial(
      this.defaultMaterial,
      this.defaultMaterial,
      {
        friction: 0.3,
        restitution: 0.2,
      }
    );
    this.world.addContactMaterial(defaultContactMaterial);
    this.world.defaultContactMaterial = defaultContactMaterial;
    
    // Create ground
    this.createGround();
    
    // Objects map to link Three.js and Cannon.js objects
    this.objectsToUpdate = [];
  }
  
  createGround() {
    // Create a ground plane
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({
      mass: 0, // Static body
      material: this.defaultMaterial,
    });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Rotate to be flat
    this.world.addBody(groundBody);
    
    return groundBody;
  }
  
  createPlayerBody(x, y, z) {
    // Create a player physics body (capsule shape)
    const radius = 0.5;
    const height = 1.0;
    const playerShape = new CANNON.Cylinder(
      radius,
      radius,
      height,
      8
    );
    
    this.playerBody = new CANNON.Body({
      mass: 80, // 80kg
      material: this.defaultMaterial,
      shape: playerShape,
      position: new CANNON.Vec3(x, y, z),
      fixedRotation: true, // Prevent player from rotating
      linearDamping: 0.9, // Add some damping to movement
    });
    
    // Add player body to world
    this.world.addBody(this.playerBody);
    
    // Create contact detection for ground check
    this.playerIsOnGround = false;
    this.playerBody.addEventListener('collide', (event) => {
      // Check if collision is with ground
      const contact = event.contact;
      
      // If contact normal is pointing up, player is on ground
      if (contact.ni.y > 0.5) {
        this.playerIsOnGround = true;
      }
    });
    
    return this.playerBody;
  }
  
  createBox(width, height, depth, position, quaternion, mass = 1) {
    // Create a box shape
    const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
    
    // Create a body
    const body = new CANNON.Body({
      mass,
      shape,
      material: this.defaultMaterial,
      position: new CANNON.Vec3(position.x, position.y, position.z),
    });
    
    if (quaternion) {
      body.quaternion.copy(quaternion);
    }
    
    // Add body to world
    this.world.addBody(body);
    
    return body;
  }
  
  createSphere(radius, position, mass = 1) {
    // Create a sphere shape
    const shape = new CANNON.Sphere(radius);
    
    // Create a body
    const body = new CANNON.Body({
      mass,
      shape,
      material: this.defaultMaterial,
      position: new CANNON.Vec3(position.x, position.y, position.z),
    });
    
    // Add body to world
    this.world.addBody(body);
    
    return body;
  }
  
  addObjectToUpdate(mesh, body) {
    this.objectsToUpdate.push({
      mesh,
      body,
    });
  }
  
  updatePlayerVelocity(x, y, z) {
    // Set player velocity
    this.playerBody.velocity.x = x;
    this.playerBody.velocity.y = y;
    this.playerBody.velocity.z = z;
  }
  
  getPlayerPosition() {
    return new THREE.Vector3(
      this.playerBody.position.x,
      this.playerBody.position.y,
      this.playerBody.position.z
    );
  }
  
  isPlayerOnGround() {
    return this.playerIsOnGround;
  }
  
  update(deltaTime) {
    // Step the physics world
    this.world.step(1 / 60, deltaTime, 3);
    
    // Reset ground check for next frame
    this.playerIsOnGround = false;
    
    // Update all objects
    for (const object of this.objectsToUpdate) {
      object.mesh.position.copy(object.body.position);
      object.mesh.quaternion.copy(object.body.quaternion);
    }
  }
} 

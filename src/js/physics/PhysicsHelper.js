import * as CANNON from 'cannon-es';

export class PhysicsHelper {
  constructor(world, defaultMaterial) {
    this.world = world;
    this.defaultMaterial = defaultMaterial;
  }

  addBox(position, dimensions, options = {}) {
    // Create box shape
    const shape = new CANNON.Box(new CANNON.Vec3(
      dimensions.width / 2,
      dimensions.height / 2,
      dimensions.depth / 2
    ));

    // Create body
    const body = new CANNON.Body({
      mass: options.mass ?? 1,
      material: this.defaultMaterial,
      position: new CANNON.Vec3(position.x, position.y, position.z),
      shape: shape,
    });

    // Set additional properties
    if (options.restitution !== undefined) {
      const contactMaterial = new CANNON.ContactMaterial(
        this.defaultMaterial,
        this.defaultMaterial,
        {
          restitution: options.restitution,
        }
      );
      this.world.addContactMaterial(contactMaterial);
    }

    // Add body to world
    this.world.addBody(body);

    return body;
  }

  addSphere(position, radius, options = {}) {
    // Create sphere shape
    const shape = new CANNON.Sphere(radius);

    // Create body
    const body = new CANNON.Body({
      mass: options.mass ?? 1,
      material: this.defaultMaterial,
      position: new CANNON.Vec3(position.x, position.y, position.z),
      shape: shape,
    });

    // Set additional properties
    if (options.restitution !== undefined) {
      const contactMaterial = new CANNON.ContactMaterial(
        this.defaultMaterial,
        this.defaultMaterial,
        {
          restitution: options.restitution,
        }
      );
      this.world.addContactMaterial(contactMaterial);
    }

    // Add body to world
    this.world.addBody(body);

    return body;
  }

  addCylinder(position, radius, height, options = {}) {
    // Create cylinder shape
    const shape = new CANNON.Cylinder(radius, radius, height, 8);

    // Create body
    const body = new CANNON.Body({
      mass: options.mass ?? 1,
      material: this.defaultMaterial,
      position: new CANNON.Vec3(position.x, position.y, position.z),
      shape: shape,
    });

    // Set additional properties
    if (options.restitution !== undefined) {
      const contactMaterial = new CANNON.ContactMaterial(
        this.defaultMaterial,
        this.defaultMaterial,
        {
          restitution: options.restitution,
        }
      );
      this.world.addContactMaterial(contactMaterial);
    }

    // Add body to world
    this.world.addBody(body);

    return body;
  }

  addPlane(position = { x: 0, y: 0, z: 0 }, normal = { x: 0, y: 1, z: 0 }, options = {}) {
    // Create plane shape
    const shape = new CANNON.Plane();

    // Create body
    const body = new CANNON.Body({
      mass: 0, // Planes should be static (mass = 0)
      material: this.defaultMaterial,
      position: new CANNON.Vec3(position.x, position.y, position.z),
      shape: shape,
    });

    // Set plane normal by calculating the rotation from the up vector to the desired normal
    const upVector = new CANNON.Vec3(0, 1, 0);
    const normalVector = new CANNON.Vec3(normal.x, normal.y, normal.z);
    
    if (Math.abs(normalVector.y) !== 1) {
      // If normal is not straight up or down, calculate the rotation axis and angle
      const rotationAxis = new CANNON.Vec3();
      upVector.cross(normalVector, rotationAxis);
      rotationAxis.normalize();
      const angle = Math.acos(upVector.dot(normalVector));
      body.quaternion.setFromAxisAngle(rotationAxis, angle);
    } else if (normalVector.y === -1) {
      // If normal points straight down, rotate 180 degrees around X axis
      body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI);
    }
    // If normal points straight up (y === 1), no rotation needed

    // Set additional properties
    if (options.restitution !== undefined) {
      const contactMaterial = new CANNON.ContactMaterial(
        this.defaultMaterial,
        this.defaultMaterial,
        {
          restitution: options.restitution,
        }
      );
      this.world.addContactMaterial(contactMaterial);
    }

    // Add body to world
    this.world.addBody(body);

    return body;
  }

  removeBody(body) {
    this.world.removeBody(body);
  }
} 
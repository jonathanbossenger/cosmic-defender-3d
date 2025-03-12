/**
 * HUD - Heads-up display for showing player information
 */
export class HUD {
  /**
   * Create a new HUD
   * @param {HTMLElement} container - Container element to add HUD to
   */
  constructor(container) {
    this.container = container;
    
    // HUD elements
    this.elements = {
      healthBar: null,
      healthText: null,
      crosshair: null,
    };
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the HUD
   */
  init() {
    // Create HUD container
    this.hudContainer = document.createElement('div');
    this.hudContainer.style.position = 'absolute';
    this.hudContainer.style.top = '0';
    this.hudContainer.style.left = '0';
    this.hudContainer.style.width = '100%';
    this.hudContainer.style.height = '100%';
    this.hudContainer.style.pointerEvents = 'none';
    this.container.appendChild(this.hudContainer);
    
    // Create health bar
    this.createHealthBar();
    
    // Create crosshair
    this.createCrosshair();
  }
  
  /**
   * Create health bar
   */
  createHealthBar() {
    // Create health bar container
    const healthContainer = document.createElement('div');
    healthContainer.style.position = 'absolute';
    healthContainer.style.bottom = '20px';
    healthContainer.style.left = '20px';
    healthContainer.style.width = '200px';
    healthContainer.style.height = '20px';
    healthContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    healthContainer.style.borderRadius = '10px';
    healthContainer.style.padding = '2px';
    this.hudContainer.appendChild(healthContainer);
    
    // Create health bar
    this.elements.healthBar = document.createElement('div');
    this.elements.healthBar.style.width = '100%';
    this.elements.healthBar.style.height = '100%';
    this.elements.healthBar.style.backgroundColor = '#00ff00';
    this.elements.healthBar.style.borderRadius = '8px';
    this.elements.healthBar.style.transition = 'width 0.2s ease-out';
    healthContainer.appendChild(this.elements.healthBar);
    
    // Create health text
    this.elements.healthText = document.createElement('div');
    this.elements.healthText.style.position = 'absolute';
    this.elements.healthText.style.top = '50%';
    this.elements.healthText.style.left = '50%';
    this.elements.healthText.style.transform = 'translate(-50%, -50%)';
    this.elements.healthText.style.color = '#ffffff';
    this.elements.healthText.style.fontFamily = 'Arial, sans-serif';
    this.elements.healthText.style.fontSize = '12px';
    this.elements.healthText.style.textShadow = '1px 1px 1px rgba(0, 0, 0, 0.5)';
    healthContainer.appendChild(this.elements.healthText);
  }
  
  /**
   * Create crosshair
   */
  createCrosshair() {
    // Create crosshair container
    const crosshairContainer = document.createElement('div');
    crosshairContainer.style.position = 'absolute';
    crosshairContainer.style.top = '50%';
    crosshairContainer.style.left = '50%';
    crosshairContainer.style.transform = 'translate(-50%, -50%)';
    crosshairContainer.style.width = '20px';
    crosshairContainer.style.height = '20px';
    this.hudContainer.appendChild(crosshairContainer);
    
    // Create crosshair lines
    const createLine = (vertical) => {
      const line = document.createElement('div');
      line.style.position = 'absolute';
      line.style.backgroundColor = '#ffffff';
      
      if (vertical) {
        line.style.width = '2px';
        line.style.height = '20px';
        line.style.left = '50%';
        line.style.transform = 'translateX(-50%)';
      } else {
        line.style.width = '20px';
        line.style.height = '2px';
        line.style.top = '50%';
        line.style.transform = 'translateY(-50%)';
      }
      
      return line;
    };
    
    // Add vertical and horizontal lines
    crosshairContainer.appendChild(createLine(true));
    crosshairContainer.appendChild(createLine(false));
    
    this.elements.crosshair = crosshairContainer;
  }
  
  /**
   * Update health display
   * @param {number} health - Current health
   * @param {number} maxHealth - Maximum health
   */
  updateHealth(health, maxHealth) {
    const percentage = (health / maxHealth) * 100;
    this.elements.healthBar.style.width = `${percentage}%`;
    this.elements.healthText.textContent = `${Math.ceil(health)} / ${maxHealth}`;
    
    // Update color based on health percentage
    if (percentage > 60) {
      this.elements.healthBar.style.backgroundColor = '#00ff00'; // Green
    } else if (percentage > 30) {
      this.elements.healthBar.style.backgroundColor = '#ffff00'; // Yellow
    } else {
      this.elements.healthBar.style.backgroundColor = '#ff0000'; // Red
    }
  }
  
  /**
   * Show damage indicator
   */
  showDamageIndicator() {
    // Create damage overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
    overlay.style.pointerEvents = 'none';
    this.hudContainer.appendChild(overlay);
    
    // Fade out and remove
    setTimeout(() => {
      overlay.style.transition = 'opacity 0.5s ease-out';
      overlay.style.opacity = '0';
      
      setTimeout(() => {
        this.hudContainer.removeChild(overlay);
      }, 500);
    }, 100);
  }
  
  /**
   * Dispose of HUD
   */
  dispose() {
    if (this.hudContainer && this.hudContainer.parentNode) {
      this.hudContainer.parentNode.removeChild(this.hudContainer);
    }
  }
} 
import { EventEmitter } from '../../utils/EventEmitter.js';

/**
 * ComboSystem - Handles combo tracking, multipliers, and related feedback
 */
export class ComboSystem {
  constructor() {
    this.events = new EventEmitter();
    
    // Combo state
    this.comboCount = 0;
    this.maxCombo = 0;
    this.comboMultiplier = 1.0;
    this.comboTimer = 0;
    this.comboDuration = 3.0; // seconds before combo resets
    
    // Multiplier thresholds
    this.multiplierThresholds = [
      { count: 0, multiplier: 1.0 },
      { count: 5, multiplier: 1.25 },
      { count: 10, multiplier: 1.5 },
      { count: 20, multiplier: 1.75 },
      { count: 30, multiplier: 2.0 },
      { count: 50, multiplier: 2.5 },
      { count: 75, multiplier: 3.0 },
      { count: 100, multiplier: 4.0 }
    ];
    
    // Combo UI elements
    this.comboContainer = null;
    this.comboCountElement = null;
    this.comboMultiplierElement = null;
    this.comboTimerElement = null;
    
    // Flags
    this.active = false;
    this.initialized = false;
    
    // Combo bonuses
    this.scoreBonus = 0;
    this.damageBonus = 0;
    
    // Combo settings
    this.settings = {
      enableScoreBonus: true,
      enableDamageBonus: true,
      scoreMultiplierEnabled: true,
      damageMultiplierEnabled: false,
      comboDecayRate: 1.0, // How fast the combo timer decreases
      minimumDamageForCombo: 1, // Minimum damage to increment combo
      criticalHitComboBonus: 2, // Extra combo points for critical hits
      comboBreakPenalty: 0.5, // Multiplier for score loss on combo break
      maxComboMultiplier: 5.0 // Cap on combo multiplier
    };
  }
  
  /**
   * Initialize the combo system
   */
  init() {
    if (this.initialized) return;
    
    // Create UI elements
    this.createComboUI();
    
    this.initialized = true;
    this.active = true;
    console.log('Combo System initialized');
  }
  
  /**
   * Create combo UI elements
   */
  createComboUI() {
    // Create combo container
    this.comboContainer = document.createElement('div');
    this.comboContainer.className = 'combo-container';
    this.comboContainer.style.position = 'absolute';
    this.comboContainer.style.bottom = '20px';
    this.comboContainer.style.right = '20px';
    this.comboContainer.style.fontFamily = 'Arial, sans-serif';
    this.comboContainer.style.color = 'white';
    this.comboContainer.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
    this.comboContainer.style.transition = 'transform 0.2s ease-out';
    this.comboContainer.style.opacity = '0';
    this.comboContainer.style.pointerEvents = 'none';
    document.body.appendChild(this.comboContainer);
    
    // Create combo count element
    this.comboCountElement = document.createElement('div');
    this.comboCountElement.className = 'combo-count';
    this.comboCountElement.style.fontSize = '36px';
    this.comboCountElement.style.fontWeight = 'bold';
    this.comboCountElement.style.textAlign = 'right';
    this.comboCountElement.textContent = '0';
    this.comboContainer.appendChild(this.comboCountElement);
    
    // Create combo text element
    const comboTextElement = document.createElement('div');
    comboTextElement.className = 'combo-text';
    comboTextElement.style.fontSize = '18px';
    comboTextElement.style.textAlign = 'right';
    comboTextElement.textContent = 'COMBO';
    this.comboContainer.appendChild(comboTextElement);
    
    // Create combo multiplier element
    this.comboMultiplierElement = document.createElement('div');
    this.comboMultiplierElement.className = 'combo-multiplier';
    this.comboMultiplierElement.style.fontSize = '24px';
    this.comboMultiplierElement.style.fontWeight = 'bold';
    this.comboMultiplierElement.style.textAlign = 'right';
    this.comboMultiplierElement.style.color = '#ffcc00';
    this.comboMultiplierElement.textContent = 'x1.0';
    this.comboContainer.appendChild(this.comboMultiplierElement);
    
    // Create combo timer element (visual bar)
    this.comboTimerElement = document.createElement('div');
    this.comboTimerElement.className = 'combo-timer';
    this.comboTimerElement.style.width = '100%';
    this.comboTimerElement.style.height = '4px';
    this.comboTimerElement.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
    this.comboTimerElement.style.marginTop = '5px';
    this.comboTimerElement.style.position = 'relative';
    this.comboContainer.appendChild(this.comboTimerElement);
    
    // Create combo timer fill element
    this.comboTimerFillElement = document.createElement('div');
    this.comboTimerFillElement.className = 'combo-timer-fill';
    this.comboTimerFillElement.style.width = '100%';
    this.comboTimerFillElement.style.height = '100%';
    this.comboTimerFillElement.style.backgroundColor = '#ffcc00';
    this.comboTimerFillElement.style.position = 'absolute';
    this.comboTimerFillElement.style.top = '0';
    this.comboTimerFillElement.style.left = '0';
    this.comboTimerElement.appendChild(this.comboTimerFillElement);
  }
  
  /**
   * Register a hit to increase combo
   * @param {Object} hitData - Data about the hit
   * @returns {Object} Updated combo information
   */
  registerHit(hitData) {
    if (!this.active) return { comboCount: 0, comboMultiplier: 1.0 };
    
    const { damage, isCritical } = hitData;
    
    // Check if damage is enough to increment combo
    if (damage < this.settings.minimumDamageForCombo) return {
      comboCount: this.comboCount,
      comboMultiplier: this.comboMultiplier
    };
    
    // Increment combo count
    const comboIncrement = isCritical ? 
      1 + this.settings.criticalHitComboBonus : 1;
    
    this.comboCount += comboIncrement;
    
    // Update max combo
    if (this.comboCount > this.maxCombo) {
      this.maxCombo = this.comboCount;
      this.events.emit('maxComboUpdated', this.maxCombo);
    }
    
    // Reset combo timer
    this.comboTimer = this.comboDuration;
    
    // Update combo multiplier
    this.updateComboMultiplier();
    
    // Update UI
    this.updateComboUI();
    
    // Show combo animation
    this.showComboAnimation(comboIncrement, isCritical);
    
    // Emit combo updated event
    this.events.emit('comboUpdated', {
      comboCount: this.comboCount,
      comboMultiplier: this.comboMultiplier,
      comboTimer: this.comboTimer,
      maxCombo: this.maxCombo,
      isNewHit: true,
      isCritical: isCritical
    });
    
    return {
      comboCount: this.comboCount,
      comboMultiplier: this.comboMultiplier
    };
  }
  
  /**
   * Update the combo multiplier based on current combo count
   */
  updateComboMultiplier() {
    // Find the highest threshold that the current combo count exceeds
    let multiplier = 1.0;
    
    for (let i = this.multiplierThresholds.length - 1; i >= 0; i--) {
      const threshold = this.multiplierThresholds[i];
      if (this.comboCount >= threshold.count) {
        multiplier = threshold.multiplier;
        break;
      }
    }
    
    // Cap at maximum multiplier
    this.comboMultiplier = Math.min(multiplier, this.settings.maxComboMultiplier);
    
    // Update score and damage bonuses
    if (this.settings.enableScoreBonus) {
      this.scoreBonus = this.settings.scoreMultiplierEnabled ? 
        this.comboMultiplier - 1.0 : 0;
    }
    
    if (this.settings.enableDamageBonus) {
      this.damageBonus = this.settings.damageMultiplierEnabled ? 
        (this.comboMultiplier - 1.0) * 0.5 : 0; // Half effect on damage
    }
  }
  
  /**
   * Update combo UI elements
   */
  updateComboUI() {
    if (!this.initialized) return;
    
    // Update combo count
    this.comboCountElement.textContent = this.comboCount.toString();
    
    // Update combo multiplier
    this.comboMultiplierElement.textContent = `x${this.comboMultiplier.toFixed(1)}`;
    
    // Update combo timer fill
    const timerPercentage = (this.comboTimer / this.comboDuration) * 100;
    this.comboTimerFillElement.style.width = `${timerPercentage}%`;
    
    // Show/hide combo container based on combo count
    if (this.comboCount > 0) {
      this.comboContainer.style.opacity = '1';
      this.comboContainer.style.transform = 'scale(1)';
    } else {
      this.comboContainer.style.opacity = '0';
      this.comboContainer.style.transform = 'scale(0.8)';
    }
    
    // Update colors based on multiplier
    let color = '#ffffff';
    if (this.comboMultiplier >= 4.0) color = '#ff00ff'; // Purple
    else if (this.comboMultiplier >= 3.0) color = '#ff0000'; // Red
    else if (this.comboMultiplier >= 2.0) color = '#ff6600'; // Orange
    else if (this.comboMultiplier >= 1.5) color = '#ffcc00'; // Yellow
    
    this.comboCountElement.style.color = color;
    this.comboMultiplierElement.style.color = color;
    this.comboTimerFillElement.style.backgroundColor = color;
  }
  
  /**
   * Show combo animation
   * @param {number} increment - Amount the combo increased by
   * @param {boolean} isCritical - Whether this was a critical hit
   */
  showComboAnimation(increment, isCritical) {
    if (!this.initialized) return;
    
    // Create animation element
    const animation = document.createElement('div');
    animation.className = 'combo-animation';
    animation.style.position = 'absolute';
    animation.style.right = '0';
    animation.style.bottom = '100%';
    animation.style.fontFamily = 'Arial, sans-serif';
    animation.style.fontWeight = 'bold';
    animation.style.fontSize = isCritical ? '24px' : '18px';
    animation.style.color = isCritical ? '#ff0000' : '#ffcc00';
    animation.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
    animation.style.opacity = '0';
    animation.style.transform = 'translateY(20px)';
    animation.style.transition = 'all 0.5s ease-out';
    animation.textContent = `+${increment}`;
    
    // Add to combo container
    this.comboContainer.appendChild(animation);
    
    // Trigger animation
    setTimeout(() => {
      animation.style.opacity = '1';
      animation.style.transform = 'translateY(0)';
    }, 10);
    
    // Remove after animation completes
    setTimeout(() => {
      animation.style.opacity = '0';
      animation.style.transform = 'translateY(-20px)';
      
      setTimeout(() => {
        if (animation.parentNode) {
          animation.parentNode.removeChild(animation);
        }
      }, 500);
    }, 500);
  }
  
  /**
   * Break the current combo
   * @param {string} reason - Reason for breaking the combo
   * @returns {Object} Combo break information
   */
  breakCombo(reason = 'timeout') {
    if (this.comboCount <= 0) return { 
      previousCombo: 0, 
      scorePenalty: 0 
    };
    
    const previousCombo = this.comboCount;
    const previousMultiplier = this.comboMultiplier;
    
    // Calculate score penalty
    const scorePenalty = Math.floor(
      previousCombo * this.settings.comboBreakPenalty
    );
    
    // Reset combo
    this.comboCount = 0;
    this.comboTimer = 0;
    this.updateComboMultiplier();
    
    // Update UI
    this.updateComboUI();
    
    // Show combo break animation
    this.showComboBreakAnimation(previousCombo, reason);
    
    // Emit combo break event
    this.events.emit('comboBroken', {
      previousCombo,
      previousMultiplier,
      scorePenalty,
      reason
    });
    
    return {
      previousCombo,
      scorePenalty
    };
  }
  
  /**
   * Show combo break animation
   * @param {number} comboValue - Value of the broken combo
   * @param {string} reason - Reason for breaking the combo
   */
  showComboBreakAnimation(comboValue, reason) {
    if (!this.initialized) return;
    
    // Create animation container
    const container = document.createElement('div');
    container.className = 'combo-break-container';
    container.style.position = 'absolute';
    container.style.top = '50%';
    container.style.left = '50%';
    container.style.transform = 'translate(-50%, -50%) scale(0.8)';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.textAlign = 'center';
    container.style.color = '#ff0000';
    container.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
    container.style.opacity = '0';
    container.style.transition = 'all 0.3s ease-out';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '1000';
    document.body.appendChild(container);
    
    // Create combo break text
    const breakText = document.createElement('div');
    breakText.className = 'combo-break-text';
    breakText.style.fontSize = '32px';
    breakText.style.fontWeight = 'bold';
    breakText.textContent = 'COMBO BROKEN';
    container.appendChild(breakText);
    
    // Create combo value text
    const valueText = document.createElement('div');
    valueText.className = 'combo-break-value';
    valueText.style.fontSize = '48px';
    valueText.style.fontWeight = 'bold';
    valueText.textContent = comboValue.toString();
    container.appendChild(valueText);
    
    // Create reason text
    const reasonText = document.createElement('div');
    reasonText.className = 'combo-break-reason';
    reasonText.style.fontSize = '18px';
    reasonText.style.marginTop = '10px';
    
    // Set reason text based on reason
    switch (reason) {
      case 'timeout':
        reasonText.textContent = 'Combo Timed Out';
        break;
      case 'damage':
        reasonText.textContent = 'Player Took Damage';
        break;
      case 'death':
        reasonText.textContent = 'Player Died';
        break;
      default:
        reasonText.textContent = 'Combo Lost';
    }
    
    container.appendChild(reasonText);
    
    // Trigger animation
    setTimeout(() => {
      container.style.opacity = '1';
      container.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 10);
    
    // Remove after animation completes
    setTimeout(() => {
      container.style.opacity = '0';
      container.style.transform = 'translate(-50%, -50%) scale(1.2)';
      
      setTimeout(() => {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }, 500);
    }, 2000);
  }
  
  /**
   * Get the current combo multiplier
   * @returns {number} Current combo multiplier
   */
  getComboMultiplier() {
    return this.comboMultiplier;
  }
  
  /**
   * Get the current score bonus from combo
   * @returns {number} Score bonus multiplier
   */
  getScoreBonus() {
    return this.scoreBonus;
  }
  
  /**
   * Get the current damage bonus from combo
   * @returns {number} Damage bonus multiplier
   */
  getDamageBonus() {
    return this.damageBonus;
  }
  
  /**
   * Update the combo system
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    if (!this.active || this.comboCount <= 0) return;
    
    // Update combo timer
    this.comboTimer -= deltaTime * this.settings.comboDecayRate;
    
    // Check if combo should break
    if (this.comboTimer <= 0) {
      this.breakCombo('timeout');
      return;
    }
    
    // Update UI
    this.updateComboUI();
    
    // Emit combo timer updated event
    this.events.emit('comboTimerUpdated', {
      comboCount: this.comboCount,
      comboMultiplier: this.comboMultiplier,
      comboTimer: this.comboTimer,
      maxCombo: this.maxCombo
    });
  }
  
  /**
   * Handle player taking damage
   * @param {Object} damageData - Data about the damage taken
   */
  onPlayerDamage(damageData) {
    // Break combo if player takes damage
    if (this.comboCount > 0) {
      this.breakCombo('damage');
    }
  }
  
  /**
   * Handle player death
   */
  onPlayerDeath() {
    // Break combo if player dies
    if (this.comboCount > 0) {
      this.breakCombo('death');
    }
  }
  
  /**
   * Reset the combo system
   */
  reset() {
    this.comboCount = 0;
    this.comboTimer = 0;
    this.updateComboMultiplier();
    this.updateComboUI();
  }
  
  /**
   * Set combo system settings
   * @param {Object} newSettings - New settings to apply
   */
  setSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
  }
  
  /**
   * Activate or deactivate the combo system
   * @param {boolean} active - Whether the system should be active
   */
  setActive(active) {
    this.active = active;
    
    // Update UI visibility
    if (this.initialized) {
      this.comboContainer.style.display = active ? 'block' : 'none';
    }
  }
  
  /**
   * Dispose of resources
   */
  dispose() {
    // Remove DOM elements
    if (this.comboContainer && this.comboContainer.parentNode) {
      this.comboContainer.parentNode.removeChild(this.comboContainer);
    }
    
    // Remove all event listeners
    this.events.removeAllListeners();
    
    // Reset state
    this.comboCount = 0;
    this.comboMultiplier = 1.0;
    this.comboTimer = 0;
    
    // Reset flags
    this.initialized = false;
    this.active = false;
  }
} 
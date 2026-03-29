export default class SynthicideCombat extends Combat {
  /** @override */
  async startCombat() {
    const result = await super.startCombat();
    // Toggle the virtual grid overlay ON if setting is enabled
    try {
      if (game.settings.get('synthicide', 'virtualGridMovement') && canvas.virtualGrid) {
        canvas.virtualGrid.visible = true;
        canvas.virtualGrid.drawVirtualGrid();
      }
    } catch (e) {
      console.warn('[SynthicideCombat] Could not toggle virtual grid overlay on combat start:', e);
    }
    return result;
  }

  /** @override */
  async endCombat() {
    const result = await super.endCombat();
    // Toggle the virtual grid overlay OFF
    try {
      if (canvas.virtualGrid) {
        canvas.virtualGrid.visible = false;
        canvas.virtualGrid.clear();
      }
    } catch (e) {
      console.warn('[SynthicideCombat] Could not toggle virtual grid overlay on combat end:', e);
    }
    return result;
  }

  /** @override */  
  async _onStartTurn(combatant) {
    await super._onStartTurn(combatant);
    console.log (`At start of turn for ${combatant.name}`);

    // refresh force barrier if required
    const forceBarrierData = combatant.actor?.system.armorValues?.forceBarrier;
    if (forceBarrierData) {
      if ( forceBarrierData.max > 0 && forceBarrierData.value > 0 && forceBarrierData.recoveryRate > 0) {
        const newValue = Math.min(forceBarrierData.max, forceBarrierData.value + forceBarrierData.recoveryRate);
        if (forceBarrierData.value !== newValue) {
            await combatant.actor.update({'system.armorValues.forceBarrier.value': newValue});
        }
      }
    }
  }

  /** @override */
  async _onEndTurn(combatant) {
    await super._onEndTurn(combatant);
    console.log (`At end of turn for ${combatant.name}`);
  }
}
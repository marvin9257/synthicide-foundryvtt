export default class SynthicideCombat extends Combat {
  /** @override */
  async startCombat() {
    const result = await super.startCombat();
    return result;
  }

  /** @override */
  async endCombat() {
    const result = await super.endCombat();
    return result;
  }

  /** @override */
  async _onUpdate(data, options, userId) {
    await super._onUpdate(data, options, userId);
    // Only update overlay if combat is starting (first turn of first round)
    if (data.turn === 0 && data.round === 1) {
      if (canvas.virtualGrid?.updateVirtualGridOverlay) {
        canvas.virtualGrid.updateVirtualGridOverlay();
      }
    }
  }

  /** @override */
  async _onDelete(options, userId) {
    await super._onDelete(options, userId);
    if (canvas.virtualGrid?.updateVirtualGridOverlay) {
      canvas.virtualGrid.updateVirtualGridOverlay();
    }
  }

  /** @override */  
  async _onStartTurn(combatant) {
    await super._onStartTurn(combatant);
    
    //Refresh Force Barrier if Applicable
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
  }
}
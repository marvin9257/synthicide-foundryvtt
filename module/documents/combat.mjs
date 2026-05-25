import { createActionMessage } from "../rolls/action-rolls.mjs";
import { prepareChallengeCardData } from "../rolls/challenge-card-data.mjs";
import { safeRenderVirtualGrid } from "../canvas/virtual-grid-overlay.mjs";

export default class SynthicideCombat extends foundry.documents.Combat {
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
      safeRenderVirtualGrid();
    }
  }

  /** @override */
  async _onDelete(options, userId) {
    await super._onDelete(options, userId);
    safeRenderVirtualGrid();
  }

  /** @override */  
  async _onStartTurn(combatant) {
    await super._onStartTurn(combatant);
    const actor = combatant?.actor;
    if (!actor || actor.statuses?.has('dead')) return;

    const messageMode = game.settings.get('core', 'messageMode');
    await this._refreshForceBarrierOnStartTurn(actor);
    await this._handleBurningOnStartTurn(actor, messageMode);
    await this._handleFlashBlindOnStartTurn(actor, messageMode);
  }

  async _refreshForceBarrierOnStartTurn(actor) {
    const forceBarrierData = actor.system.armorValues?.forceBarrier;
    if (!forceBarrierData) return;
    if (!(forceBarrierData.max > 0 && forceBarrierData.value > 0 && forceBarrierData.recoveryRate > 0)) return;

    const newValue = Math.min(forceBarrierData.max, forceBarrierData.value + forceBarrierData.recoveryRate);
    if (forceBarrierData.value !== newValue) {
      await actor.update({'system.armorValues.forceBarrier.value': newValue});
    }
  }

  async _handleBurningOnStartTurn(actor, messageMode) {
    if (!actor.statuses?.has('burning')) return;

    const cinderRoll = await new Roll('1d10').evaluate();
    const cinderDamage = Number(cinderRoll.total ?? 0);

    if (cinderDamage > 0) {
      await actor.damageActor(cinderDamage, {
        messageMode,
        specialAmmoUsed: 'none',
      });

      await cinderRoll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor }),
        flavor: `Cinder: ${actor.name} takes ${cinderDamage} burning damage.`,
      }, { messageMode });
    }

    if (cinderDamage % 2 === 1 && actor.statuses?.has('burning')) {
      await actor.toggleStatusEffect('burning', { active: false });
    }
  }

  async _handleFlashBlindOnStartTurn(actor, messageMode) {
    if (!actor.statuses?.has('blind')) return;

    const difficulty = 6;
    const toughnessValue = Number(actor.system.attributes?.toughness?.value ?? 0);
    const flashRoll = await new Roll('1d10 + @attribute', { attribute: toughnessValue }).evaluate();
    const flashSucceeded = Number(flashRoll.total ?? 0) >= difficulty;
    const cardData = prepareChallengeCardData({
      input: {
        attribute: 'toughness',
        difficulty,
        misc: 0,
        modifiers: 0,
        messageMode,
      },
      actor,
      rollResult: flashRoll,
      attributeValue: toughnessValue,
      difficulty,
    });

    cardData.flavor = flashSucceeded
      ? `Flash: ${actor.name} beats RD ${difficulty}; blind is removed.`
      : `Flash: ${actor.name} fails RD ${difficulty} and loses their turn.`;

    await createActionMessage({
      actor,
      roll: flashRoll,
      cardData,
      messageMode,
    });

    if (flashSucceeded) {
      await actor.toggleStatusEffect('blind', { active: false });
      return;
    }

    //const remainingCombatants = this.turns.filter((turnActor) => !turnActor.isDefeated);
    //if (remainingCombatants.length > 1) {
    //  await this.nextTurn();
    //}
  }

  /** @override */
  async _onEndTurn(combatant) {
    await super._onEndTurn(combatant);
    const actor = combatant?.actor;
    if (!actor ) return;
    if (actor.statuses?.has('frozen')) {
      await actor.toggleStatusEffect('frozen', { active: false });
    }
  }

  /** @override */
  async _onEndRound() {
    await super._onEndRound?.();

    // Homing lock only affects subsequent attacks in the same round.
    for (const combatant of this.combatants ?? []) {
      const actor = combatant?.actor;
      if (!actor) continue;
      if (!actor.statuses?.has('target')) continue;
      await actor.toggleStatusEffect('target', { active: false });
    }
  }
}
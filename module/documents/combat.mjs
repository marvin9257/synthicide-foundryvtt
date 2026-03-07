export default class SynthicideCombat extends Combat {
  /** @override */  
  async _onStartTurn(combatant) {
      await super._onStartTurn(combatant)
      console.log (`At start of turn for ${combatant.name}`);
  }
  /** @override */
  async _onEndTurn(combatant) {
      await super._onEndTurn(combatant)
      console.log (`At end of turn for ${combatant.name}`)
  }
}
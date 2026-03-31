// Utility to extract standardized roll/card data from a chat message

/**
 * Extracts and normalizes roll/card data from a chat message.
 * Returns a flat object with common properties for all card types.
 * @param {ChatMessage} message
 * @returns {object}
 */
export function getStandardizedRollData(message) {
  const flags = message.getFlag('synthicide', 'actionRoll') ?? {};
  let data = {};
  if (flags.subtype === 'attack' && flags.attack) data = flags.attack;
  else if (flags.subtype === 'challenge' && flags.challenge) data = flags.challenge;
  else if (flags.subtype === 'damage' && flags.damage) data = flags.damage;
  return {
    subtype: flags.subtype,
    ...data,
    actorUuid: flags.actorUuid,
    userId: flags.userId,
    messageMode: flags.messageMode,
    sourceItemUuid: flags.sourceItemUuid,
    sourceMessageId: flags.sourceMessageId,
  };
}

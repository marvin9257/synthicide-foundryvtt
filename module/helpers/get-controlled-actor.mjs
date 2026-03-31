/**
 * Utility to robustly get the currently controlled actor for the user.
 * - For GMs: returns the actor of the currently selected token (if any).
 * - For players: returns the actor of their first controlled token (if any).
 * - Fallback: returns the user's primary character (if any).
 * @returns {Actor|null}
 */

export function getControlledActor() {
  // If tokens layer is not ready
  if (!canvas.tokens) {
    // GM: no fallback
    if (game.user.isGM) return null;
    // Player: fallback to user's primary character
    return game.user?.character ?? null;
  }

  const controlledTokens = canvas.tokens.controlled;

  // GM: any controlled token's actor
  if (game.user.isGM) {
    for (const token of controlledTokens) {
      if (token.actor) return token.actor;
    }
    return null;
  }

  // Player: first controlled token's actor they own
  for (const token of controlledTokens) {
    if (token.actor && token.actor.isOwner) return token.actor;
  }

  // Player fallback: user's primary character
  return game.user?.character ?? null;
}

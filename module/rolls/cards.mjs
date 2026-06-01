import { localize } from './roll-utils.mjs';
import { SynthicideChatMessage } from '../documents/synthicide-chat-message.mjs';

export function normalizeMessageMode(mode) {
  return CONFIG.ChatMessage.modes?.[mode] ? mode : 'public';
}

export async function createActionMessage(args = {}) {
  return SynthicideChatMessage.createActionMessage(args);
}

export async function createBlastSummaryMessage({ actor, summaryRows, messageMode }) {
  const summaryTable = `
    <div class="synthicide-blast-summary">
      <strong>${localize('SYNTHICIDE.Roll.BlastSummary.Title')}</strong>
      <table>
        <thead><tr><th>${localize('SYNTHICIDE.Roll.BlastSummary.Target')}</th><th>${localize('SYNTHICIDE.Roll.BlastSummary.AD')}</th><th>${localize('SYNTHICIDE.Roll.BlastSummary.Roll')}</th><th>${localize('SYNTHICIDE.Roll.BlastSummary.Result')}</th></tr></thead>
        <tbody>${summaryRows.join('')}</tbody>
      </table>
    </div>
  `;
  await ChatMessage.create({
    content: summaryTable,
    speaker: ChatMessage.getSpeaker({ actor }),
  }, { messageMode: normalizeMessageMode(messageMode) });
}

import { localize } from './roll-utils.mjs';

export function normalizeMessageMode(mode) {
  return CONFIG.ChatMessage.modes?.[mode] ? mode : 'public';
}

export function getChatMessageStyle() {
  const styles = CONST.CHAT_MESSAGE_STYLES;
  return styles.ROLL ?? styles.OTHER ?? 0;
}

export async function renderActionCardHtml({ template, cardData, rollHtml = '' }) {
  return foundry.applications.handlebars.renderTemplate(template, {
    ...cardData,
    rollHtml,
  });
}

export function buildChatMessageData({ actor, content, cardData, whisper }) {
  const chatData = {
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    style: getChatMessageStyle(),
  };

  if (cardData?.type) chatData.type = cardData.type;
  chatData.system = foundry?.utils?.deepClone ? foundry.utils.deepClone(cardData?.system ?? {}) : (cardData?.system ?? {});

  if (cardData?.title) chatData.title = cardData.title;
  if (Array.isArray(whisper) && whisper.length) chatData.whisper = whisper;
  return chatData;
}

export async function createActionMessage({ actor, roll, cardData, template, messageMode, whisper } = {}) {
  const normalizedMode = normalizeMessageMode(messageMode);
  if (roll) {
    const rollHtml = await roll.render();
    const cardHtml = await renderActionCardHtml({ template, cardData, rollHtml });
    return roll.toMessage(buildChatMessageData({ actor, content: cardHtml, cardData, whisper }), {
      messageMode: normalizedMode,
      create: true,
    });
  }

  const cardHtml = await renderActionCardHtml({ template, cardData });
  const chatData = buildChatMessageData({ actor, content: cardHtml, cardData, whisper });
  return ChatMessage.create(chatData, { messageMode: normalizedMode });
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

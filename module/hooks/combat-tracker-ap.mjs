export function registerCombatTrackerApHooks() {
  Hooks.on('renderCombatTracker', (app, element) => {
    const combatRows = element.querySelectorAll('.combatant[data-combatant-id]');
    for (const combatantRow of combatRows) {
      renderCombatantApPill(app, combatantRow);
    }
  });

  Hooks.once('ready', () => {
    void syncActiveCombatTrackerState();
  });
}

async function syncActiveCombatTrackerState() {
  if (!game.user.isActiveGM) return;

  const viewedCombat = game.combats?.viewed;
  if (!viewedCombat?.started) return;

  // Ensure core tracked resources are populated for all rows on initial load.
  for (const combatant of viewedCombat.combatants) {
    combatant.updateResource();
  }

  // Ensure AP current is synced for the currently active turn immediately on startup.
  if (viewedCombat.combatant && typeof viewedCombat.resetCombatantActionPointsForTurn === 'function') {
    await viewedCombat.resetCombatantActionPointsForTurn(viewedCombat.combatant);
  }

  ui.combat?.render(false);
}

function renderCombatantApPill(app, combatantRow) {
  const doc = combatantRow.ownerDocument;
  const combatantId = String(combatantRow.dataset.combatantId ?? '');
  if (!combatantId) return;

  const combat = app.viewed;
  const combatant = combat.combatants.get(combatantId);
  if (!combatant) return;

  const anchor =
    combatantRow.querySelector('.token-initiative')
    ?? combatantRow.querySelector('.combatant-controls')
    ?? combatantRow;

  const current = Number(combat.getCombatantActionPointsCurrent(combatant));
  const max = Number(combat.getCombatantActionPointsMax(combatant));
  const canAdjust = game.user.isGM || combatant.isOwner;
  const hasTrackedResource = combatant.resource !== null && combatant.resource !== undefined;

  let pillElement = combatantRow.querySelector('.synthicide-ap-pill');
  let valueElement;
  let minusButton;
  let plusButton;

  if (!pillElement) {
    pillElement = doc.createElement('span');
    pillElement.className = 'synthicide-ap-pill';
    pillElement.dataset.combatantId = combatantId;
    pillElement.title = 'Action Points';

    const icon = doc.createElement('i');
    icon.className = 'synthicide-ap-icon fa-solid fa-gauge-high';
    icon.setAttribute('aria-hidden', 'true');

    minusButton = doc.createElement('button');
    minusButton.type = 'button';
    minusButton.className = 'synthicide-ap-btn synthicide-ap-dec';
    minusButton.textContent = '-';

    valueElement = doc.createElement('span');
    valueElement.className = 'synthicide-ap-value';

    plusButton = doc.createElement('button');
    plusButton.type = 'button';
    plusButton.className = 'synthicide-ap-btn synthicide-ap-inc';
    plusButton.textContent = '+';

    minusButton.addEventListener('click', (event) => {
      void onApDeltaClick(event, app, combatantId, -1);
    });
    plusButton.addEventListener('click', (event) => {
      void onApDeltaClick(event, app, combatantId, 1);
    });

    pillElement.append(icon, minusButton, valueElement, plusButton);

    if (anchor.classList.contains('token-initiative')) {
      anchor.parentElement?.insertBefore(pillElement, anchor);
    } else if (anchor.classList.contains('combatant-controls')) {
      anchor.insertAdjacentElement('afterend', pillElement);
    } else {
      anchor.prepend(pillElement);
    }
  } else {
    valueElement = pillElement.querySelector('.synthicide-ap-value');
    minusButton = pillElement.querySelector('.synthicide-ap-dec');
    plusButton = pillElement.querySelector('.synthicide-ap-inc');
  }

  if (valueElement) valueElement.textContent = String(current);
  if (minusButton) minusButton.disabled = !canAdjust || current <= 0;
  if (plusButton) plusButton.disabled = !canAdjust || current >= max;
  pillElement.classList.toggle('synthicide-ap-pill-compact', hasTrackedResource);
}

async function onApDeltaClick(event, app, combatantId, delta) {
  event.preventDefault();
  event.stopPropagation();

  const button = event.currentTarget;
  const combat = app.viewed;

  button.disabled = true;
  try {
    await combat.modifyCombatantActionPoints(combatantId, delta);
  } finally {
    app.render(false);
  }
}

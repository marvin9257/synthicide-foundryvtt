const AMMO_RULES = {
  none: {
    attack: {},
    onHit: {},
  },
  stun: {
    attack: {},
    onHit: {
      statusToggles: [{ id: 'stun', active: true }],
    },
  },
  cryo: {
    attack: {},
    onHit: {
      statusToggles: [{ id: 'frozen', active: true }],
    },
  },
  homing: {
    attack: {
      lethalOverride: 6,
    },
    onHit: {
      statusToggles: [{ id: 'target', active: true }],
    },
  },
  cinder: {
    attack: {},
    onHit: {
      statusToggles: [{ id: 'burning', active: true }],
      immediateDamageDice: 1,
    },
  },
  poison: {
    attack: {},
    onHit: {
      statusToggles: [{ id: 'poison', active: true }],
    },
  },
  anchor: {
    attack: {},
    onHit: {
      statusToggles: [{ id: 'restrain', active: true }],
    },
  },
  flash: {
    attack: {},
    onHit: {
      statusToggles: [{ id: 'blind', active: true }],
    },
  },
  powerWounding: {
    attack: {
      extraDamageDice: 2,
      lethalOverride: 8,
    },
    onHit: {},
  },
};

export function normalizeAmmoKey(ammoKey) {
  const key = String(ammoKey ?? 'none').trim();
  return AMMO_RULES[key] ? key : 'none';
}

export function resolveAmmoAttackEffects({ ammoKey } = {}) {
  const key = normalizeAmmoKey(ammoKey);
  const attack = AMMO_RULES[key]?.attack ?? {};
  const lethalOverride = attack.lethalOverride;
  return {
    ammoKey: key,
    attackBonusDelta: Number(attack.attackBonusDelta ?? 0),
    damageBonusDelta: Number(attack.damageBonusDelta ?? 0),
    rangeModifierDelta: Number(attack.rangeModifierDelta ?? 0),
    extraDamageDice: Number(attack.extraDamageDice ?? 0),
    lethalOverride: Number.isFinite(lethalOverride) ? lethalOverride : null,
  };
}

export function resolveAmmoOnHitEffects({ ammoKey } = {}) {
  const key = normalizeAmmoKey(ammoKey);
  const onHit = AMMO_RULES[key]?.onHit ?? {};
  return {
    ammoKey: key,
    immediateDamageDice: Number(onHit.immediateDamageDice ?? 0),
    statusToggles: Array.isArray(onHit.statusToggles)
      ? onHit.statusToggles.map((effect) => ({
        id: String(effect?.id ?? ''),
        active: effect?.active !== false,
      })).filter((effect) => effect.id)
      : [],
  };
}
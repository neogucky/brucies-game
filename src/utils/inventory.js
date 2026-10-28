export function normalizeInventory(saveData = {}) {
  const legacyConsumables = saveData.consumables || {};
  const legacyEquipment = saveData.equipment || {};
  const existingInventory = saveData.inventory || {};
  const existingEquipped = saveData.equipped || {};

  const inventory = {
    weapons: { sword: true, ...(existingInventory.weapons || {}) },
    passives: { ...(existingInventory.passives || {}) },
    consumables: { ...(existingInventory.consumables || {}) },
    companions: { default: true, ...(existingInventory.companions || {}) },
    armor: { helmet: true, ...(existingInventory.armor || {}) },
  };
  // Remove the former belt item from old saves. Potion pockets are always available.
  delete inventory.armor.leatherBelt;

  if (legacyEquipment.shield) {
    inventory.passives.shield = true;
  }
  if (legacyEquipment.shoes) {
    inventory.passives.shoes = true;
  }

  const honeyCount =
    Number.isFinite(existingInventory.consumables?.honey)
      ? existingInventory.consumables.honey
      : legacyConsumables.honey ?? 0;
  inventory.consumables.honey = honeyCount;

  const hasEquippedWeapon = Object.prototype.hasOwnProperty.call(existingEquipped, "weapon");
  const hasEquippedPassive = Object.prototype.hasOwnProperty.call(existingEquipped, "passive");
  const hasEquippedConsumable = Object.prototype.hasOwnProperty.call(existingEquipped, "consumable");
  const hasEquippedCompanion = Object.prototype.hasOwnProperty.call(existingEquipped, "companion");

  const equipped = {
    weapon: hasEquippedWeapon ? existingEquipped.weapon : "sword",
    passive: hasEquippedPassive ? existingEquipped.passive : null,
    consumable: hasEquippedConsumable ? existingEquipped.consumable : null,
    companion: hasEquippedCompanion ? existingEquipped.companion : "default",
  };
  if (equipped.weapon && !inventory.weapons[equipped.weapon]) {
    equipped.weapon = inventory.weapons.sword ? "sword" : null;
  }

  if (!hasEquippedPassive) {
    if (legacyEquipment.shield) {
      equipped.passive = "shield";
    } else if (legacyEquipment.shoes) {
      equipped.passive = "shoes";
    }
  }
  if (!hasEquippedConsumable && inventory.consumables.honey > 0) {
    equipped.consumable = "honey";
  }

  const gear = ["secondary", "shield", "shoes", "helmet", "consumable2"];
  const legacyEmpty = hasEquippedPassive && existingEquipped.passive === null;
  const defaults = {
    secondary: !legacyEmpty && inventory.passives.bow ? "bow" : null,
    shield: !legacyEmpty ? inventory.passives.jungleShield ? "jungleShield" : inventory.passives.shield ? "shield" : null : null,
    shoes: !legacyEmpty && inventory.passives.shoes ? "shoes" : null,
    helmet: "helmet", consumable2: null,
  };
  gear.forEach(slot => { equipped[slot] = Object.prototype.hasOwnProperty.call(existingEquipped, slot) ? existingEquipped[slot] : defaults[slot]; });
  for (const slot of ["secondary", "shield", "shoes"]) {
    if (equipped[slot] && !inventory.passives[equipped[slot]]) equipped[slot] = null;
  }
  return { inventory, equipped };
}

export function applyInventoryToSave(saveData, inventory, equipped) {
  return {
    ...saveData,
    inventory,
    equipped,
    consumables: {
      ...(saveData.consumables || {}),
      honey: inventory?.consumables?.honey ?? 0,
    },
    equipment: {
      ...(saveData.equipment || {}),
      shield: Boolean(Object.hasOwn(equipped || {}, "shield") ? equipped.shield : equipped?.passive === "shield" || equipped?.passive === "jungleShield"),
      shieldType: Object.hasOwn(equipped || {}, "shield") ? equipped.shield : (equipped?.passive === "shield" ? "shield" : null),
      shoes: Boolean(Object.hasOwn(equipped || {}, "shoes") ? equipped.shoes : equipped?.passive === "shoes"),
    },
  };
}

export function syncEquipment(scene) {
  const e = scene.equipped; if (!e) return;
  scene.hasShoes = Boolean(Object.hasOwn(e, "shoes") ? e.shoes : e.passive === "shoes");
  if (scene.equipment) Object.assign(scene.equipment, applyInventoryToSave({}, scene.inventory, e).equipment);
  scene.shield?.initFromSave(applyInventoryToSave(scene.registry.get("saveData") || {}, scene.inventory, e), { resetCooldown: false });
  scene.hud?.syncEquipment?.(e, scene.inventory);
}

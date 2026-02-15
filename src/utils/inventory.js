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
  };

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

  if (!equipped.passive) {
    if (legacyEquipment.shield) {
      equipped.passive = "shield";
    } else if (legacyEquipment.shoes) {
      equipped.passive = "shoes";
    }
  }
  if (!equipped.consumable && inventory.consumables.honey > 0) {
    equipped.consumable = "honey";
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
      shield: equipped?.passive === "shield",
      shoes: equipped?.passive === "shoes",
    },
  };
}

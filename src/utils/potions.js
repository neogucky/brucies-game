export function useBeltPotion(scene, slot = 'consumable2') {
  const s=scene, e=s.equipped;
  if (s.isPaused || s.inventoryOpen || s.confirmation?.isOpen || s.dialog?.container?.visible || s.isLoading || s.isGameOver || s.levelCompleted || s.isComplete || e?.[slot] !== 'honey') return false;
  const count=s.inventory?.consumables?.honey || 0;
  const result=s.hud.tryUseHoney({ count, health:s.health, maxHealth:s.maxHealth || 5,
    companionHealth:s.companionHealth ?? (s.helperRespawnAt ? 0 : 1), companionRespawnAt:s.companionRespawnAt || s.helperRespawnAt || 0 });
  if (!result.consumed) return false;
  s.health=result.health; s.inventory.consumables.honey=result.count;
  if (s.consumables) s.consumables.honey=result.count;
  if (typeof s.honeyCount === 'number') s.honeyCount=result.count;
  if (typeof s.companionRespawnAt === 'number') s.companionRespawnAt=result.companionRespawnAt;
  if (typeof s.helperRespawnAt === 'number') s.helperRespawnAt=result.companionRespawnAt;
  s.hud.setHealth(s.health,s.maxHealth || 5); s.hud.setConsumableCount(result.count);
  s.hud.syncEquipment?.(e,s.inventory); s.updateCompanionUI?.();
  if (s.saveInventory) s.saveInventory(); else s.saveState?.();
  return true;
}

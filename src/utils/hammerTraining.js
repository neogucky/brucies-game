import { saveProgress } from '../saveManager.js';
import { hammerTrainingState, withHammerTrainingState } from './hammerRules.js';

export function offerHammerTraining(scene, { force = false, resume = false } = {}) {
  if (!scene.scene || (resume ? !scene.scene.launch : !scene.scene.start)) return false;
  const save = scene.registry.get('saveData') || {};
  if (!scene.inventory?.weapons?.powerHammer || (!force && hammerTrainingState(save).offered)
    || scene.isPaused || scene.isGameOver || scene.levelCompleted || scene.isComplete || scene.inventoryOpen || scene.confirmation?.isOpen) return false;
  const next = withHammerTrainingState(save, { offered: true });
  scene.registry.set('saveData', next); saveProgress(next); scene.hammerCharge?.cancel();
  const key = scene.sys.settings.key;
  if (resume) {
    scene.attackInputLocked = true;
    scene.scene.launch('HammerTrainingScene', { resumeScene: key });
    scene.scene.pause();
  } else scene.scene.start('HammerTrainingScene', { returnScene: key });
  return true;
}

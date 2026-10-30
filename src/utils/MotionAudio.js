export function playMotionSound(scene, key, volume = .2, rate = 1) {
  if (scene.cache?.audio?.exists(key)) scene.sound.play(key, { volume, rate });
}

export default class MotionAudio {
  constructor(scene) { this.scene = scene; this.clock = 0; this.nextStep = 0; this.nextClimb = 0; }
  update({ state, dt, grounded, moving, landing, velocity, jump }) {
    if (!dt) return;
    const s = this.scene; this.clock += dt;
    if (moving && grounded && !s.climbingVine && !s.isSwinging && !s.hammerCharge?.holding) {
      if (this.clock >= this.nextStep) {
        const world = s.bonusWorld || (s.sys.settings.key.startsWith('Desert') ? 'desert' : s.sys.settings.key === 'JungleScene' ? 'jungle' : 'underground');
        const surface = world === 'desert' ? 'sand' : world === 'jungle' ? 'leaf' : 'stone';
        playMotionSound(s, 'sfx-footstep-' + surface, state === 'run' ? .15 : .085, this.alternate ? .96 : 1.04);
        this.alternate = !this.alternate; this.nextStep = this.clock + (state === 'run' ? 208 : 328);
      }
    } else this.nextStep = this.clock;
    if (landing) playMotionSound(s, 'sfx-landing-soft', .24);
    if (state !== this.previousState) {
      if (['crouch', 'stand', 'helmet', 'stretch'].includes(state)) playMotionSound(s, 'sfx-armor-cloth', .13);
      if (jump && state === 'rise' && this.grounded && !['JungleScene', 'UndergroundDigScene'].includes(s.sys.settings.key)) playMotionSound(s, 'sfx-jump', .22);
    }
    if (s.climbingVine && Math.abs(velocity.y) > 5 && this.clock >= this.nextClimb) {
      playMotionSound(s, 'sfx-armor-cloth', .11); this.nextClimb = this.clock + 380;
    }
    if (s.isSwinging && (!this.swinging || this.swingId !== s.swingStartedAt)) {
      if (s.equipped?.weapon === 'powerHammer') playMotionSound(s, 'sfx-hammer-swoosh', .3);
      else if (s.sys.settings.key === 'HammerTrainingScene') playMotionSound(s, 'sfx-sword-slash', .23);
    }
    this.previousState = state; this.grounded = grounded; this.swinging = s.isSwinging; this.swingId = s.swingStartedAt;
  }
}

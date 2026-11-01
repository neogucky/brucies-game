import { ITEM_DEFS, GAME_MODES } from "../utils/itemRegistry.js";
import { syncEquipment } from "../utils/inventory.js";
import { getWeaponTextures } from "../utils/weapons.js";
import { actionForKey, profileForScene } from "../utils/controlProfiles.js";

const ITEMS = {
  sword: ['Schwert', 'item-sword'], powerHammer: ['Power Hammer', 'item-power-hammer'],
  bow: ['Bogen', 'item-bow'], shield: ['Schild', 'item-shield'], jungleShield: ['Urwaldschild', 'item-jungle-shield'],
  helmet: ['Ritterhelm', 'item-helmet'], shoes: ['Flügelschuhe', 'item-winged-shoes'],
  honey: ['Honigsaft', 'item-honey'], default: ['Kleiner Helfer', 'item-companion'],
};
const STYLE = { fontFamily: 'Trebuchet MS, sans-serif', color: '#fff0ca' };
export default class InventoryOverlay {
  constructor(scene, { onEquip, onClose } = {}) {
    this.scene = scene; this.onEquip = onEquip; this.onClose = onClose;
    this.isOpen = false; this.keyHandlers = []; this.columns = []; this.selection = { col: 0, row: 0 };
  }
  open(inventory, equipped) {
    if(this.isOpen)return;
    this.inventory = inventory; this.equipped = equipped; this.isOpen = true;
    this.selection = { col: 0, row: 0 }; this.resetMovementKeys();
    this.previousDragThreshold=this.scene.input.dragDistanceThreshold;
    this.scene.input.dragDistanceThreshold=8;
    this.build(); this.bindKeys(); this.bindDrag();
  }
  close() {
    if(!this.isOpen)return;
    this.isOpen=false;this.cancelDrag();this.container?.setVisible(false);this.unbindKeys();this.unbindDrag();
    this.scene.input.dragDistanceThreshold=this.previousDragThreshold;this.chooser=null;
  }
  requestClose(){if(!this.isOpen)return;this.close();this.onClose?.();}
  setVisible(value) { this.container?.setVisible(value); }
  destroy() { this.close();this.unbindKeys();this.unbindDrag();this.container?.destroy(true);this.container=null; }
  resetMovementKeys() {
    [...Object.values(this.scene.cursors || {}), ...Object.values(this.scene.wasd || {})].forEach(k => k?.reset?.());
    this.scene.player?.body?.setVelocity(0, 0);
  }
  createColumns() {
    const i = this.inventory || {}, e = this.equipped || {};
    const option = id => ({ id, icon: ITEMS[id]?.[1] || null, label: ITEMS[id]?.[0] || 'Leer lassen',
      supportedModes: ITEM_DEFS[id]?.supportedModes || [GAME_MODES.ISOMETRIC, GAME_MODES.JUMP],
      count: id === 'honey' ? '×' + (i.consumables?.honey || 0) : '' });
    const owned = (ids, group) => [option(null), ...ids.filter(id => group?.[id]).map(option)];
    const potions = () => [option(null), ...(i.consumables?.honey > 0 ? [option('honey')] : [])];
    return [
      { key:'weapon',title:'Primärwaffe',x:122,y:174,options:owned(['sword','powerHammer'],i.weapons) },
      { key:'secondary',title:'Sekundärwaffe',x:122,y:296,options:owned(['bow'],i.passives) },
      { key:'shield',title:'Schild · Rücken',x:122,y:418,options:owned(['shield','jungleShield'],i.passives) },
      { key:'helmet',title:'Helm',x:538,y:174,options:owned(['helmet'],i.armor) },
      { key:'companion',title:'Begleiter',x:538,y:296,options:owned(['default'],i.companions) },
      { key:'shoes',title:'Schuhe',x:538,y:418,options:owned(['shoes'],i.passives) },
      { key:'consumable',title:'Trank 1 · {potion1}',x:268,y:492,options:potions() },
      { key:'consumable2',title:'Trank 2 · {potion2}',x:392,y:492,options:potions() },
    ].map(c=>({...c,equipped:e[c.key]??null}));
  }
  build() {
    this.cancelDrag();this.container?.destroy(true);
    const s=this.scene,add=obj=>{this.container.add(obj);return obj;};
    this.container=s.add.container(0,0).setDepth(900).setScrollFactor(0);
    add(s.add.rectangle(480,300,960,600,0x08150f,.82).setInteractive());
    add(s.add.rectangle(480,292,912,536,0x263b30,.99).setStrokeStyle(3,0xc6a86c));
    add(s.add.text(54,52,'Deine Ausrüstung',{...STYLE,fontFamily:'Georgia, serif',fontSize:'29px'}));
    add(s.add.line(0,0,624,103,624,538,0x9a946c,.6).setOrigin(0));
    add(s.add.ellipse(330,396,155,24,0x0b2117,.55));
    const gender=s.registry.get('saveData')?.playerGender;
    const neutral=s.registry.get('level-motion-assets')?.poses?.[gender==='female'?16:0];
    if(neutral){
      const scale=1.4,feetY=396;
      this.portrait=add(s.add.image(330,feetY,neutral.key).setOrigin(.5,1).setScale(scale).setFlipX(true));
      const weapon=this.equipped.weapon,part=s.registry.get('melee-animation-assets')?.parts[weapon];
      if(part){
        const grip=neutral.otherHand||neutral.hand,partScale=(weapon==='powerHammer'?33:38)*scale/.6/part.length;
        add(s.add.image(330+grip.x*scale,feetY+grip.y*scale,part.key).setOrigin(part.originX,part.originY)
          .setScale(-partScale,partScale).setRotation(-2-part.angle));
      }
    }else this.portrait=add(s.add.image(330,286,getWeaponTextures(this.equipped.weapon,gender).standingTexture).setDisplaySize(226,226));
    add(s.add.rectangle(330,492,200,22,0x6b4b2e).setStrokeStyle(2,0xa27c4b));
    this.columns=this.createColumns();
    this.columns.forEach((c,index)=>{
      const current=c.options.find(o=>o.id===c.equipped)||c.options[0];
      const small=index>=6,w=small?72:82,h=small?62:74;
      const frame=add(s.add.rectangle(c.x,c.y,w,h,0xe7d5ac,.12).setInteractive({useHandCursor:true}));
      const icon=current.icon?add(s.add.image(c.x,c.y,current.icon).setDisplaySize(small?46:57,small?46:57))
        :add(s.add.text(c.x,c.y,'+',{...STYLE,fontSize:'29px',color:'#a8bb99'}).setOrigin(.5));
      const label=add(s.add.text(c.x,c.y-(small?46:54),c.title,{...STYLE,fontSize:'16px'}).setOrigin(.5));
      const name=add(s.add.text(c.x,c.y+(small?39:46),current.id?current.label+(current.count?' '+current.count:''):'Leer',
        {...STYLE,fontSize:'13px',color:'#b9c9ad'}).setOrigin(.5));
      const arrow=add(s.add.text(c.x+w/2+9,c.y,'›',{...STYLE,fontSize:'25px',color:'#c6a86c'}).setOrigin(.5));
      c.frame=frame;c.views=[frame,icon,label,name,arrow];
      frame.on('pointerdown',()=>{this.suppressClick=false;});
      frame.on('pointerup',()=>{if(!this.suppressClick&&!this.dragged)this.chooseSlot(index);});
      if(current.id)this.makeDraggable(frame,current.id,index);
    });
    this.selection.col=Math.min(this.selection.col,this.columns.length-1);
    this.chooseSlot(this.selection.col);this.container.list.forEach(child=>child.setScrollFactor(0));
  }
  chooseSlot(index,row) {
    const c=this.columns[index];if(!c)return;
    this.selection={col:index,row:row===undefined?Math.max(0,c.options.findIndex(o=>o.id===c.equipped)):row};
    this.showOptions();this.refreshHighlights();
  }
  showOptions() {
    this.chooser?.destroy(true);const s=this.scene,c=this.columns[this.selection.col];
    this.chooser=s.add.container(0,0);this.container.add(this.chooser);
    const add=o=>{this.chooser.add(o);return o;};
    add(s.add.text(650,115,c.title,{...STYLE,fontSize:'23px',fontStyle:'bold'}));
    add(s.add.text(650,148,'Antippen oder zum Platz ziehen',{...STYLE,fontSize:'14px',color:'#b9c9ad'}));
    this.optionCards=[];
    const ordered=c.options.map((o,row)=>({o,row})).sort((a,b)=>Number(a.o.id===null)-Number(b.o.id===null));
    ordered.forEach(({o,row},position)=>{
      const y=215+position*93,chosen=row===this.selection.row,equipped=o.id===c.equipped;
      const frame=add(s.add.rectangle(778,y,258,80,equipped?0x61532e:0x304d3d,.98).setInteractive({useHandCursor:true}));
      if(o.icon)add(s.add.image(687,y,o.icon).setDisplaySize(48,48));
      else add(s.add.text(687,y,'×',{...STYLE,fontSize:'31px',color:'#bdc9b2'}).setOrigin(.5));
      add(s.add.text(725,y-19,o.label+(o.count?' '+o.count:''),{...STYLE,fontSize:'17px'}));
      add(s.add.text(725,y+9,equipped?'Angelegt':o.id?'Anlegen':'Ablegen',{...STYLE,fontSize:'13px',color:equipped?'#f2d584':'#b5d7c4'}));
      if(o.id)for(let dx=0;dx<2;dx++)for(let dy=0;dy<3;dy++)add(s.add.circle(886+dx*6,y-6+dy*6,1.4,0x9cb6a0,.7));
      frame.on('pointerdown',()=>{this.suppressClick=false;});
      frame.on('pointerup',()=>{if(!this.suppressClick&&!this.dragged){this.selection.row=row;this.applySelection();}});
      if(o.id)this.makeDraggable(frame,o.id,null);
      this.optionCards.push({frame,row,equipped});
      frame.setStrokeStyle(chosen?3:1,chosen?0x9ad3e0:0x667d65);
    });
    this.chooser.list.forEach(child=>child.setScrollFactor(0));
  }
  confirm(){this.applySelection();}
  canEquip(index,id){return Boolean(this.columns[index]?.options.some(o=>o.id===id&&(!this.scene.gameMode||o.supportedModes.includes(this.scene.gameMode))));}
  equip(index,id,from=null){
    if(!this.canEquip(index,id))return false;
    const c=this.columns[index],changed=[];
    if(from!==null&&from!==index){
      if(!this.canEquip(from,this.equipped[c.key]??null))return false;
      this.equipped[this.columns[from].key]=this.equipped[c.key]??null;changed.push(this.columns[from].key);
    }
    this.equipped[c.key]=id;changed.push(c.key);
    this.equipped.passive=this.equipped.secondary||null;
    Object.assign(this.scene.equipped,this.equipped);
    changed.forEach(key=>this.onEquip?.(key,this.equipped[key]));
    syncEquipment(this.scene);this.scene.saveInventory?.();this.scene.saveState?.();
    this.selection.col=index;this.build();return true;
  }
  applySelection(){
    const c=this.columns[this.selection.col],o=c?.options[this.selection.row];
    return o?this.equip(this.selection.col,o.id):false;
  }
  makeDraggable(object,id,from){
    object.inventoryItem={owner:this,id,from};this.scene.input.setDraggable(object,true);
  }
  bindDrag(){
    this.unbindDrag();
    this.dragStart=(pointer,object)=>{
      if(!this.isOpen||object.inventoryItem?.owner!==this)return;
      const {id,from}=object.inventoryItem;this.dragged={object,id,from};this.suppressClick=true;
      this.ghost=this.scene.add.image(pointer.x,pointer.y,ITEMS[id][1]).setDisplaySize(68,68).setAlpha(.92).setScrollFactor(0);
      this.container.add(this.ghost);this.refreshHighlights();
    };
    this.dragMove=(pointer,object)=>{if(this.dragged?.object===object)this.ghost?.setPosition(pointer.x,pointer.y);};
    this.dragEnd=(pointer,object)=>{
      if(this.dragged?.object!==object)return;
      const {id,from}=this.dragged;
      const index=this.columns.findIndex(c=>Math.abs(pointer.x-c.x)<=46&&Math.abs(pointer.y-c.y)<=40);
      this.cancelDrag();if(index>=0)this.equip(index,id,from);
    };
    this.scene.input.on('dragstart',this.dragStart);this.scene.input.on('drag',this.dragMove);this.scene.input.on('dragend',this.dragEnd);
  }
  unbindDrag(){
    if(this.dragStart)this.scene.input.off('dragstart',this.dragStart);
    if(this.dragMove)this.scene.input.off('drag',this.dragMove);
    if(this.dragEnd)this.scene.input.off('dragend',this.dragEnd);
    this.dragStart=this.dragMove=this.dragEnd=null;
  }
  cancelDrag(){this.ghost?.destroy();this.ghost=null;this.dragged=null;this.refreshHighlights();}
  refreshHighlights(){
    this.columns.forEach((c,i)=>{
      const valid=this.dragged&&this.canEquip(i,this.dragged.id),dim=this.dragged&&!valid;
      c.views?.forEach(v=>v.setAlpha(dim ? .32 : 1));
      c.frame?.setFillStyle(valid?0x7fbd91:0xe7d5ac,valid ? .32 : .12);
      c.frame?.setStrokeStyle(valid?4:i===this.selection.col?3:2,valid?0xb7f4bb:i===this.selection.col?0x9ad3e0:c.equipped?0xc8ae68:0x687a68);
    });
  }
  selectColumn(index){this.chooseSlot((index+this.columns.length)%this.columns.length);}
  bindKeys(){
    this.unbindKeys();const keyboard=this.scene.input.keyboard;
    const handler=event=>{
      if(!this.isOpen)return;
      if(event.code==='ArrowLeft')this.selectColumn(this.selection.col-1);
      if(event.code==='ArrowRight')this.selectColumn(this.selection.col+1);
      const delta=event.code==='ArrowUp'?-1:event.code==='ArrowDown'?1:0;
      if(delta){const n=this.columns[this.selection.col].options.length;this.chooseSlot(this.selection.col,(this.selection.row+delta+n)%n);}
      if(event.code==='Enter')this.confirm();
      if(event.code==='Escape'||actionForKey(event,profileForScene(this.scene))==='inventory')this.requestClose();
    };
    keyboard.on('keydown',handler);this.keyHandlers.push(handler);
  }
  unbindKeys(){this.keyHandlers.forEach(h=>this.scene.input.keyboard.off('keydown',h));this.keyHandlers=[];}
}

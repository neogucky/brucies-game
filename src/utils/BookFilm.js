import BookPresentation from './BookPresentation.js';
import { bookFilmFrame, bookDuration } from './bookTimeline.js';

export default class BookFilm {
  constructor(scene, film) {
    this.scene=scene;this.film=film;this.duration=bookDuration(film);
    this.key='book-screen-'+scene.sys.settings.key;
    if(scene.textures.exists(this.key))scene.textures.remove(this.key);
    this.texture=scene.textures.createCanvas(this.key,1586,992);
    this.painter=new BookPresentation(this.texture.getSourceImage(),key=>scene.textures.get(key).getSourceImage(),film,{
      reducedMotion:scene.reducedMotion,female:scene.registry.get('saveData')?.playerGender==='female',
    });
    this.image=scene.add.image(480,300,this.key).setDisplaySize(960,600);
  }
  frameAt(time){return bookFilmFrame(this.film,time);}
  draw(time){
    const frame=this.painter.draw(time);
    if(this.painter.changed)this.texture.refresh();
    return frame;
  }
  destroy(){
    this.image.destroy();
    if(this.scene.textures.exists(this.key))this.scene.textures.remove(this.key);
    this.painter=null;this.texture=null;this.image=null;
  }
}

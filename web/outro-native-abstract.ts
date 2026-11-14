import type {AuthoredRibbon} from './ink-ribbon-handoff';
import {isOrnatePreset,type OrnateFrame} from './ornate-types';
import {ornateOpeningFrameColors,type OutroAppearance} from './motion-palette';
import {drawBotanicalCompanion,type BotanicalPreset} from './ornate-botanical';
import {drawMythicCompanion,type MythicPreset} from './ornate-mythic';
import {drawCelestialCompanion,type CelestialPreset} from './ornate-celestial';
import {drawCometHeadArtwork} from './comet-intro';
import {drawClassicEntryParticle} from './entry-particle-artwork';
import {paintRibbonArtwork} from './native-artwork';

function nativeFragment(ctx:CanvasRenderingContext2D,appearance:OutroAppearance,p:number,color:string,colors:readonly string[],variant:number):void{
 const id=appearance.intro;
 if(isOrnatePreset(id)){
  const palette=ornateOpeningFrameColors(id,appearance.ink),frame:OrnateFrame={time:p*1.5,phase:'outro',progress:p,open:1,...palette};
  if(['orbit','bloom','moon','stellar'].includes(id))drawCelestialCompanion(ctx,id as CelestialPreset,frame,variant);
  else if(['unicorn','wings','fan','dragon'].includes(id))drawMythicCompanion(ctx,id as MythicPreset,frame,variant);
  else drawBotanicalCompanion(ctx,id as BotanicalPreset,frame,variant);
 }else if(id==='comet'){
  drawCometHeadArtwork(ctx,colors[0]??color,colors[2]??'#ffffff');
 }else{
  ctx.fillStyle=color;ctx.strokeStyle=color;ctx.shadowColor=color;ctx.shadowBlur=63;
  drawClassicEntryParticle(ctx,'orb',{radius:30,color,opacity:1});
 }
}

/** Vortex flights retain the actual selected entry's fragments and palette. */
export function vortexOutroPainter(p:number,colors:readonly string[],ribbons:readonly AuthoredRibbon[],appearance:OutroAppearance={intro:'classic',ink:'#ffffff'}):(ctx:CanvasRenderingContext2D)=>void{
 return ctx=>{
  const order=[...ribbons].sort((a,b)=>a.samples.reduce((n,q)=>n+q.z,0)/Math.max(1,a.samples.length)-b.samples.reduce((n,q)=>n+q.z,0)/Math.max(1,b.samples.length));
  for(const ribbon of order){
   const ornate=isOrnatePreset(appearance.intro),comet=appearance.intro==='comet';
   const bounds=ornate?{x:-88,y:-88,width:176,height:176}:comet?{x:-94,y:-58,width:154,height:116}:{x:-105,y:-115,width:210,height:230};
   const painter=(paint:CanvasRenderingContext2D)=>nativeFragment(paint,appearance,p,ribbon.color,colors,ribbon.id);
   paintRibbonArtwork(ctx,ribbon,{start:comet?{x:-45,y:0}:ornate?{x:0,y:52}:{x:0,y:-30},end:comet?{x:22,y:0}:ornate?{x:0,y:-52}:{x:0,y:30},halfWidth:comet?21:ornate?48:30,bounds},painter);
  }
 };
}

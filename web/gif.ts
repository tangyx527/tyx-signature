import {validateConfig,type WebConfig} from './model';
import {prepareScene,renderScene} from './renderer';
import {cancelled} from './audio';

const FPS=15;
const MAX_SIZE=720;

export type GifExportOptions={
  signal?:AbortSignal;
  onProgress?:(progress:number,stage:string)=>void;
};

/** GIF files stay small when the long edge is capped; the MP4 keeps full 1080p. */
export function gifSize(aspect:WebConfig['canvas']['aspect']){const {width,height}={width:aspect==='portrait'?1080:aspect==='square'?1080:1920,height:aspect==='portrait'?1920:aspect==='square'?1080:1080};const scale=Math.min(1,MAX_SIZE/Math.max(width,height));return {width:Math.round(width*scale/2)*2,height:Math.round(height*scale/2)*2};}

export async function exportGif(input:WebConfig,options:GifExportOptions={}):Promise<Blob>{
  const {signal,onProgress}=options;
  cancelled(signal);
  if(typeof document==='undefined')throw new Error('当前浏览器环境无法导出 GIF，请换用较新的系统浏览器。');
  const config=validateConfig(input);
  onProgress?.(0,'准备绘制');
  const scene=prepareScene(config);
  const frames=Math.round(scene.duration*FPS);
  const {width,height}=gifSize(config.canvas.aspect);
  const canvas=document.createElement('canvas');
  canvas.width=scene.width;
  canvas.height=scene.height;
  const small=document.createElement('canvas');
  small.width=width;
  small.height=height;
  const smallContext=small.getContext('2d',{alpha:false});
  if(!smallContext)throw new Error('当前浏览器无法创建签名画布，请换用系统浏览器。');
  smallContext.imageSmoothingEnabled=true;
  smallContext.imageSmoothingQuality='high';
  try{
    cancelled(signal);
    const {GIFEncoder,quantize,applyPalette}=await import('gifenc');
    const encoder=GIFEncoder();
    for(let frame=0;frame<frames;frame++){
      cancelled(signal);
      // The shared renderer always paints at full scene size, so downscale afterwards.
      renderScene(canvas,scene,frame/FPS);
      smallContext.drawImage(canvas,0,0,width,height);
      const {data}=smallContext.getImageData(0,0,width,height);
      const palette=quantize(data,256);
      encoder.writeFrame(applyPalette(data,palette),width,height,{palette,delay:Math.round(1000/FPS)});
      onProgress?.(.02+.9*(frame+1)/frames,`制作 GIF ${frame+1} / ${frames} 帧`);
      // Give touch, progress painting and cancel events time to run; this does not set animation timing.
      if(frame%4===0)await new Promise<void>(resolve=>setTimeout(resolve,0));
    }
    cancelled(signal);
    onProgress?.(.96,'整理 GIF 文件');
    encoder.finish();
    const bytes=encoder.bytes();
    if(!bytes.byteLength)throw new Error('导出没有生成可用的 GIF 文件，请重试');
    const blob=new Blob([bytes.slice().buffer as ArrayBuffer],{type:'image/gif'});
    onProgress?.(1,'GIF 已准备好');
    return blob;
  }catch(error){
    cancelled(signal);
    if(error instanceof Error&&error.name==='AbortError')throw error;
    const message=error instanceof Error?error.message:'GIF 编码失败';
    throw new Error(`导出失败：${message}。请重试，或换用系统浏览器、电脑。`,{cause:error});
  }finally{
    canvas.width=1;
    canvas.height=1;
    small.width=1;
    small.height=1;
  }
}

declare module 'gifenc'{
  export type GIFEncoderOptions={auto?:boolean;initialCapacity?:number};
  export type GIFEncoderInstance={
    writeFrame(index:Uint8Array,width:number,height:number,options?:{
      palette?:number[][];first?:boolean;transparent?:boolean;transparentIndex?:number;
      delay?:number;repeat?:number;dispose?:number;
    }):void;
    finish():void;
    bytes():Uint8Array;
    bytesView():Uint8Array;
    reset():void;
  };
  export function GIFEncoder(options?:GIFEncoderOptions):GIFEncoderInstance;
  export function quantize(data:Uint8Array|Uint8ClampedArray,maxColors:number,options?:{
    format?:'rgb565'|'rgb444'|'rgba4444';oneBitAlpha?:boolean;clearAlpha?:boolean;
  }):number[][];
  export function applyPalette(data:Uint8Array|Uint8ClampedArray,palette:number[][],format?:'rgb565'|'rgb444'|'rgba4444'):Uint8Array;
  export function nearestColorIndex(palette:number[][],pixel:number[]):number;
  export function prequantize(data:Uint8Array|Uint8ClampedArray,options?:{roundRGB?:number;roundAlpha?:number;oneBitAlpha?:boolean}):void;
}

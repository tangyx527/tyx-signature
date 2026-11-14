import type {Point} from '../src/geometry';

export type OrnatePhase='intro'|'writing'|'outro';
export type OrnateFrame={time:number;phase:OrnatePhase;progress:number;open:number;color:string;accent:string};
export const newOrnatePresets=[
 {id:'crystal-vine',label:'晶叶星藤',accent:'#b693ff',exit:'scatter',description:'晶叶与卷藤展开，随后叶片绕着字迹飘动。'},
 {id:'butterfly',label:'蝶舞星河',accent:'#78d9ff',exit:'scatter',description:'晶蝶与星核展开，随后小蝶围绕签名飞行。'},
 {id:'lotus',label:'莲华涟漪',accent:'#ffa7d5',exit:'spiral',description:'莲花分层绽放，随后莲瓣与水滴沿字迹游动。'},
 {id:'umbrella',label:'伞下花雨',accent:'#6fefdb',exit:'fold',description:'纸伞旋转撑开，随后伞瓣、坠饰与雨滴绕字轻落。'},
 {id:'unicorn',label:'星驹踏光',accent:'#c7b6ff',exit:'lift',description:'晶翼星驹抬首，随后羽光、鬃光与角晶围绕字迹。'},
 {id:'snowflake',label:'霜晶回旋',accent:'#a4c9ff',exit:'lift',description:'霜晶分层展开，随后晶枝与碎晶沿签名旋绕。'},
 {id:'wings',label:'羽光合奏',accent:'#cf9fff',exit:'fold',description:'双翼舒展后散成单支羽毛，围着字迹轻摆。'},
 {id:'fan',label:'流霞展扇',accent:'#ffb8e6',exit:'fold',description:'折扇展开，随后扇叶与流苏拆开绕字飞舞。'},
 {id:'dragon',label:'云龙衔珠',accent:'#a8acff',exit:'sweep',description:'云龙循珠游动，随后鳞晶、须光与珠光沿字迹穿行。'},
 {id:'moon',label:'月轮流萤',accent:'#ffda89',exit:'spiral',description:'月弧与金轨展开，随后碎月、悬星与碎金环绕签名。'},
 {id:'stellar',label:'星核织轨',accent:'#c5e7ff',exit:'spiral',description:'星核与光束交织，随后小星晶和能量滴围绕字迹。'},
 {id:'petals',label:'花笺飞舞',accent:'#ff8db7',exit:'sweep',description:'心形光丝展开，随后独立花瓣与飞笺绕着签名飘飞。'},
] as const;
export const ornatePresets=[
 {id:'orbit',label:'星环聚光',accent:'#8cddff',exit:'spiral',description:'多层星轨展开，随后流光滴与卫星晶体沿签名运动。'},
 {id:'bloom',label:'光点绽放',accent:'#d2b3ff',exit:'scatter',description:'双层晶瓣展开，随后单片晶瓣绕着字迹穿行。'},
 ...newOrnatePresets,
] as const;
export type OrnatePreset=typeof ornatePresets[number]['id'];
export type OrnateRegion={index:number;color:string;center:Point;bounds:{minX:number;minY:number;maxX:number;maxY:number};paths:Point[][];strokeIndices:number[];pathProgress:number[]};
export type OrnateLayout={width:number;height:number;center:Point;spanX:number;spanY:number;anchors:{point:Point;color:string;index:number}[];regions:OrnateRegion[]};
export type OrnateClock={time:number;lead:number;outroStart:number;duration:number;outro?:string};
export const isOrnatePreset=(id:string):id is OrnatePreset=>ornatePresets.some(preset=>preset.id===id);

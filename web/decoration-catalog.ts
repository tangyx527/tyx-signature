export const ACTIVE_DECORATION_IDS=[
  'none','cat-ears','paw',
  'paw-wave','paw-striped','paw-beans',
  'cat-round','cat-squint','rabbit-face','panda-face','puppy-face',
  'face-sleepy','face-owo','face-smile','face-shy',
  'face-laughing','face-confused','face-shocked','face-angry','face-hurt','face-crying',
  'face-speechless','face-smug','face-in-love','face-excited','face-wink','face-dizzy',
  'pet-fox','pet-hamster','pet-penguin','pet-frog','pet-pig','pet-sheep',
  'pet-raccoon','pet-chick','pet-koala','pet-seal','pet-lion','pet-hedgehog',
  'zodiac-aries','zodiac-taurus','zodiac-gemini','zodiac-cancer','zodiac-leo','zodiac-virgo',
  'zodiac-libra','zodiac-scorpio','zodiac-sagittarius','zodiac-capricorn','zodiac-aquarius','zodiac-pisces',
] as const;

// Read old designs without reintroducing retired ornaments in the picker.
export const STORED_DECORATION_IDS=[
  ...ACTIVE_DECORATION_IDS,'cat','rabbit','bow','dog','sun','heart','star',
  'accent-moon','accent-saturn','accent-shooting-star','accent-cloud',
  'accent-lightning','accent-ribbon','accent-crown','accent-clover',
  'accent-flower','accent-music','accent-envelope','accent-candy',
] as const;
export type DecorationId=typeof ACTIVE_DECORATION_IDS[number];
export type DecorationCategory='pets'|'paws'|'expressions'|'zodiac';
export const decorationCategories:{id:DecorationCategory;label:string}[]=[
  {id:'pets',label:'萌宠'},
  {id:'paws',label:'爪爪'},
  {id:'expressions',label:'表情'},
  {id:'zodiac',label:'星座'},
];
export const decorationCatalog:{id:Exclude<DecorationId,'none'>;label:string;category:DecorationCategory}[]=[
  {id:'cat-ears',label:'猫耳',category:'pets'},
  {id:'cat-round',label:'圆圆猫',category:'pets'},
  {id:'cat-squint',label:'挤挤眼猫',category:'pets'},
  {id:'rabbit-face',label:'小兔脸',category:'pets'},
  {id:'panda-face',label:'眨眼熊猫',category:'pets'},
  {id:'puppy-face',label:'垂耳狗',category:'pets'},
  {id:'pet-fox',label:'机灵狐狸',category:'pets'},
  {id:'pet-hamster',label:'鼓脸仓鼠',category:'pets'},
  {id:'pet-penguin',label:'呆萌企鹅',category:'pets'},
  {id:'pet-frog',label:'开心青蛙',category:'pets'},
  {id:'pet-pig',label:'困困小猪',category:'pets'},
  {id:'pet-sheep',label:'软软绵羊',category:'pets'},
  {id:'pet-raccoon',label:'淘气浣熊',category:'pets'},
  {id:'pet-chick',label:'啾啾小鸡',category:'pets'},
  {id:'pet-koala',label:'瞌睡考拉',category:'pets'},
  {id:'pet-seal',label:'软萌海豹',category:'pets'},
  {id:'pet-lion',label:'奶凶狮子',category:'pets'},
  {id:'pet-hedgehog',label:'害羞刺猬',category:'pets'},
  {id:'paw',label:'软软爪印',category:'paws'},
  {id:'paw-wave',label:'举爪',category:'paws'},
  {id:'paw-striped',label:'条纹小爪',category:'paws'},
  {id:'paw-beans',label:'豆豆小爪',category:'paws'},
  {id:'face-sleepy',label:'慵懒脸',category:'expressions'},
  {id:'face-owo',label:'圆眼脸',category:'expressions'},
  {id:'face-smile',label:'嘿嘿笑',category:'expressions'},
  {id:'face-shy',label:'害羞脸',category:'expressions'},
  {id:'face-laughing',label:'爆笑脸',category:'expressions'},
  {id:'face-confused',label:'疑惑脸',category:'expressions'},
  {id:'face-shocked',label:'震惊脸',category:'expressions'},
  {id:'face-angry',label:'生气脸',category:'expressions'},
  {id:'face-hurt',label:'委屈脸',category:'expressions'},
  {id:'face-crying',label:'大哭脸',category:'expressions'},
  {id:'face-speechless',label:'无语脸',category:'expressions'},
  {id:'face-smug',label:'得意脸',category:'expressions'},
  {id:'face-in-love',label:'心动脸',category:'expressions'},
  {id:'face-excited',label:'期待脸',category:'expressions'},
  {id:'face-wink',label:'眨眼脸',category:'expressions'},
  {id:'face-dizzy',label:'宕机脸',category:'expressions'},
  {id:'zodiac-aries',label:'白羊座',category:'zodiac'},
  {id:'zodiac-taurus',label:'金牛座',category:'zodiac'},
  {id:'zodiac-gemini',label:'双子座',category:'zodiac'},
  {id:'zodiac-cancer',label:'巨蟹座',category:'zodiac'},
  {id:'zodiac-leo',label:'狮子座',category:'zodiac'},
  {id:'zodiac-virgo',label:'处女座',category:'zodiac'},
  {id:'zodiac-libra',label:'天秤座',category:'zodiac'},
  {id:'zodiac-scorpio',label:'天蝎座',category:'zodiac'},
  {id:'zodiac-sagittarius',label:'射手座',category:'zodiac'},
  {id:'zodiac-capricorn',label:'摩羯座',category:'zodiac'},
  {id:'zodiac-aquarius',label:'水瓶座',category:'zodiac'},
  {id:'zodiac-pisces',label:'双鱼座',category:'zodiac'},
];
const activeIds=new Set<string>(ACTIVE_DECORATION_IDS);
export function isDecorationId(id:string):id is DecorationId{return activeIds.has(id);}
export function categoryForDecoration(id:string):DecorationCategory|null{
  return decorationCatalog.find(item=>item.id===id)?.category??null;
}

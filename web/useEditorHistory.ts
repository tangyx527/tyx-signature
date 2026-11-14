import {useCallback,useRef,useState,type SetStateAction} from 'react';
import {commitHistory,createHistory,travelHistory} from './editor-history';

export function useEditorHistory<T>(initial:T){
  const [history,setHistory]=useState(()=>createHistory(initial));
  const serial=useRef(0),gesture=useRef<number|null>(null);
  const beginGesture=useCallback(()=>{gesture.current??=++serial.current;},[]);
  const endGesture=useCallback(()=>{gesture.current=null;},[]);
  const update=useCallback((action:SetStateAction<T>)=>{
    const group=gesture.current??++serial.current;
    setHistory(current=>commitHistory(current,typeof action==='function'?(action as (value:T)=>T)(current.present):action,group));
  },[]);
  const undo=useCallback(()=>{endGesture();setHistory(current=>travelHistory(current,'undo'));},[endGesture]);
  const redo=useCallback(()=>{endGesture();setHistory(current=>travelHistory(current,'redo'));},[endGesture]);
  return {value:history.present,update,undo,redo,canUndo:history.past.length>0,canRedo:history.future.length>0,beginGesture,endGesture};
}

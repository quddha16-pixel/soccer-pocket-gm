import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

let openModalCount=0;
let originalBodyOverflow='';
export function Modal({title,children,onClose,closeLabel='Close',className='',role='dialog',footer}:{title:string;children:ReactNode;onClose:()=>void;closeLabel?:string;className?:string;role?:'dialog'|'alertdialog';footer?:ReactNode}){
 const id=useId(),ref=useRef<HTMLElement>(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;
  if(openModalCount===0)originalBodyOverflow=document.body.style.overflow;
  openModalCount++;
  document.body.style.overflow='hidden';
  const focusable=()=>Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]')??[]).filter(el=>!el.closest('[hidden]')&&(!el.closest('details:not([open])')||el.tagName==='SUMMARY'));
  (focusable()[0]??ref.current)?.focus();
  const keyboard=(e:KeyboardEvent)=>{
   const dialogs=document.querySelectorAll('[aria-modal="true"]');if(dialogs[dialogs.length-1]!==ref.current)return;
   if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close.current();}
   if(e.key==='Tab'){const items=focusable(),first=items[0],last=items.at(-1);if(!first){e.preventDefault();ref.current?.focus();}else if(e.shiftKey&&(document.activeElement===first||!ref.current?.contains(document.activeElement))){e.preventDefault();last?.focus();}else if(!e.shiftKey&&(document.activeElement===last||!ref.current?.contains(document.activeElement))){e.preventDefault();first.focus();}}
  };
  document.addEventListener('keydown',keyboard);
  return ()=>{document.removeEventListener('keydown',keyboard);if(--openModalCount===0)document.body.style.overflow=originalBodyOverflow;if(previous?.isConnected)previous.focus({preventScroll:true});};
 },[]);
 return <div className="modal-backdrop"><section ref={ref} className={`modal ${className}`} role={role} aria-modal="true" aria-labelledby={id} tabIndex={-1}><header className="modal-header"><h2 id={id}>{title}</h2><button className="icon-button" aria-label={closeLabel} onClick={onClose}><X size={24}/></button></header><div className="modal-content">{children}</div>{footer&&<footer className="modal-action">{footer}</footer>}</section></div>;
}

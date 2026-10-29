import {useState,type ReactNode} from 'react';
import type {Club} from '../models';
import type {LegacyOpportunity as Projection} from '../simulation/legacy';
import {ClubMark} from './ClubMark';
import {LegacyOpportunity} from './LegacyOpportunity';
import {Modal} from './Modal';

export function ClubOfferCard({club,available,projection,details,onAccept,status,actionLabel='Accept offer',actionText='Accept'}:{club:Club;available:boolean;projection:Projection;details:ReactNode;onAccept:()=>void;status?:string;actionLabel?:string;actionText?:string}){
 const[open,setOpen]=useState(false);
 return <><article className={`panel offer-card compact-offer ${available?'offer-available':'offer-locked'}`} aria-label={`${club.name}: ${available?'Contract offered':'Higher reputation required'}`}>
  <span className={`offer-status ${available?'positive':''}`}>{status??(available?'Contract offered':'Locked')}</span>
  <div className="offer-heading"><ClubMark club={club}/><h2>{club.name}</h2></div>
  <LegacyOpportunity projection={projection} compact/>
  <div className="offer-actions"><button className="secondary" aria-label={`View ${club.name} offer details`} onClick={()=>setOpen(true)}>Details</button><button className={available?'primary':'secondary'} disabled={!available} aria-label={available?actionLabel:'No offer yet'} onClick={onAccept}>{available?actionText:'No offer'}</button></div>
 </article>{open&&<Modal title={club.name} closeLabel="Close club details" onClose={()=>setOpen(false)}>{details}<LegacyOpportunity projection={projection}/><button className={available?'primary full':'secondary full'} disabled={!available} onClick={()=>{setOpen(false);onAccept();}}>{available?actionLabel:'No offer yet'}</button></Modal>}</>;
}

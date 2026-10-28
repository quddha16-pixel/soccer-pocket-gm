import { useMemo } from 'react';
import type { Career, Player } from '../models';
import { developmentTrend } from '../simulation/developmentTrend';
export function DevelopmentArrows({player,career}:{player:Player;career:Career}){
 const trend=useMemo(()=>developmentTrend(player,career),[player,career.players,career.lineup,career.formation,career.world.staff,career.world.season,career.week,career.managerStyle,career.clubId,career.fixtures]),description=`${trend.label}. Estimated ${trend.annual>=0?'+':''}${trend.annual.toFixed(2)} ability points per season at current conditions; not guaranteed.`;
 return <span className={`development-arrows ${trend.direction}`} title={description} role="img" aria-label={description}>{trend.arrows?Array.from({length:trend.arrows},(_,i)=><span aria-hidden="true" key={i}>{trend.direction==='up'?'↑':'↓'}</span>):<span aria-hidden="true">—</span>}</span>;
}

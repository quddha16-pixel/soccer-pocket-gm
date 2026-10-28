import {releaseReserve} from './careerFixtures';
import {afterEach,it,expect} from 'vitest';
import {render,screen,within,fireEvent,cleanup} from '@testing-library/react';
import {useState} from 'react';
import {TransferMarket} from '../components/TransferMarket';
import {StaffScreen} from '../components/StaffScreen';
import {newCareer} from '../simulation/career';
import type {Career} from '../models';
afterEach(()=>{cleanup();sessionStorage.clear();});
it('completes a real free-agent negotiation from the market UI and updates its roster',()=>{
 let latest:Career;function Harness(){const [c,set]=useState(()=>releaseReserve(newCareer('Test','elite','liverpool',1234)));latest=c;return <TransferMarket career={c} onChange={set} onProfile={()=>{}}/>;}
 render(<Harness/>);fireEvent.change(screen.getByLabelText('Market view'),{target:{value:'Free Agents'}});const card=document.querySelector('.player-market-card')! as HTMLElement;const name=within(card).getByRole('heading').textContent!;fireEvent.click(within(card).getByRole('button',{name:'Approach player'}));fireEvent.click(screen.getByRole('button',{name:'Submit club offer'}));fireEvent.click(screen.getByRole('button',{name:'Agree terms & sign'}));expect(screen.queryByRole('dialog')).toBeNull();expect(latest!.players.some(p=>p.name===name&&p.clubId===latest!.clubId)).toBe(true);expect(latest!.world.finances.liverpool.bonuses).toBeGreaterThan(0);
});
it('hires a free-agent coach into one existing role and records staff termination costs',()=>{
 let latest:Career;function Harness(){const [c,set]=useState(newCareer('Test','unknown','hull',1234));latest=c;return <StaffScreen career={c} onChange={set}/>;}
 render(<Harness/>);fireEvent.change(screen.getByLabelText('Staff view'),{target:{value:'Staff Market'}});const card=Array.from(document.querySelectorAll('.staff-card')).find(el=>el.textContent!.includes('Free agent'))! as HTMLElement;const name=within(card).getByRole('heading').textContent!;fireEvent.click(within(card).getByRole('button',{name:'Approach staff'}));fireEvent.click(screen.getByRole('button',{name:'Agree staff contract'}));expect(screen.queryByRole('dialog')).toBeNull();expect(latest!.world.staff.some(s=>s.name===name&&s.clubId==='hull')).toBe(true);expect(latest!.world.staff.filter(s=>s.clubId==='hull')).toHaveLength(7);expect(latest!.world.finances.hull.operatingCosts).toBeGreaterThan(0);
});

import {afterEach,it,expect} from 'vitest';
import {render,screen,cleanup,waitFor,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import {SAVE_KEY} from '../storage';
import {newCareer,offers,advance} from '../simulation/career';
afterEach(()=>{cleanup();localStorage.clear();});
it('creates a career, advances, displays results, persists, navigates, and resets',async()=>{
 const user=userEvent.setup();const {unmount}=render(<App/>);
 await user.click(screen.getByRole('button',{name:/Start a new career/}));
 await user.clear(screen.getByLabelText('Manager name'));await user.type(screen.getByLabelText('Manager name'),'Jamie Test');
 await user.click(screen.getByRole('button',{name:/Find job offers/}));
 expect(screen.getAllByRole('button',{name:/Accept offer/})).toHaveLength(4);
 await user.click(screen.getAllByRole('button',{name:/Accept offer/})[0]);
 expect(screen.getByRole('heading',{name:'Club overview'})).toBeTruthy();
 await user.click(screen.getByRole('button',{name:'Advance Matchweek'}));
 const dialog=await screen.findByRole('dialog');expect(within(dialog).getByRole('heading',{name:'Matchweek 1 results'})).toBeTruthy();expect(dialog.querySelectorAll('.fixture')).toHaveLength(10);
 await user.click(within(dialog).getByRole('button',{name:/Continue to club/}));
 await waitFor(()=>expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).week).toBe(1));
 unmount();render(<App/>);await user.click(screen.getByRole('button',{name:/Continue career/}));
 await user.click(screen.getAllByRole('button',{name:'Squad'})[0]);expect(screen.getByRole('heading',{name:'First team'})).toBeTruthy();expect(document.querySelectorAll('.squad-table tbody tr')).toHaveLength(24);
 await user.click(screen.getAllByRole('button',{name:'League'})[0]);expect(document.querySelectorAll('tbody tr')).toHaveLength(20);
 await user.click(screen.getAllByRole('button',{name:'Fixtures'})[0]);expect(document.querySelectorAll('.fixture')).toHaveLength(10);
 await user.click(screen.getByRole('button',{name:'Main menu'}));await user.click(screen.getByRole('button',{name:/Start a new career/}));await user.click(screen.getByRole('button',{name:'Start completely new career'}));
 expect(screen.getByRole('heading',{name:'Meet the manager.'})).toBeTruthy();expect(localStorage.getItem(SAVE_KEY)).toBeNull();
});
it('shows Game Over for a relegated completed career',async()=>{
 let c=newCareer('Test','unknown',offers('unknown')[0].id,1);for(let i=0;i<38;i++)c=advance(c);
 // Select a genuinely relegated club from the completed simulation, rather than forcing a result.
 const {standings}=await import('../simulation/league');const {clubs}=await import('../data/clubs');
 c={...c,clubId:standings(clubs,c.fixtures)[19].clubId,status:'fired'};localStorage.setItem(SAVE_KEY,JSON.stringify(c));
 render(<App/>);await userEvent.click(screen.getByRole('button',{name:/Continue career/}));expect(screen.getByRole('heading',{name:/Game Over/})).toBeTruthy();expect(screen.queryByRole('button',{name:'Advance Matchweek'})).toBeNull();
});

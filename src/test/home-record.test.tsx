import {afterEach,it,expect} from 'vitest';
import {cleanup,render,screen,within} from '@testing-library/react';
import {Dashboard} from '../components/Dashboard';
import {newCareer,prepareWeek} from '../simulation/career';

afterEach(cleanup);
it('shows the season W/D/L record from committed results, excluding the pending match',()=>{
 const c=newCareer('Record coach','elite','everton',23),props={onMatch:()=>{},onStats:()=>{}},view=render(<Dashboard career={c} {...props}/>);
 expect(within(screen.getByRole('group',{name:'Season record'})).getAllByRole('definition').map(n=>n.textContent)).toEqual(['0','0','0']);
 const scores=[[2,0],[1,1],[0,3],[3,1]],fixtures=c.fixtures.map(f=>{if(f.week>4||![f.homeId,f.awayId].includes(c.clubId))return f;const[gf,ga]=scores[f.week-1],home=f.homeId===c.clubId;return {...f,homeGoals:home?gf:ga,awayGoals:home?ga:gf};}),played={...c,week:4,fixtures},pending=prepareWeek(played);
 view.rerender(<Dashboard career={pending} {...props}/>);
 const record=within(screen.getByRole('group',{name:'Season record'}));expect(record.getAllByRole('term').map(n=>n.textContent)).toEqual(['Wins','Draws','Losses']);expect(record.getAllByRole('definition').map(n=>n.textContent)).toEqual(['2','1','1']);expect(screen.getByText('4 matches played')).toBeTruthy();
 view.rerender(<Dashboard career={{...c,world:{...c.world,season:2027}}} {...props}/>);expect(record.getAllByRole('definition').map(n=>n.textContent)).toEqual(['0','0','0']);
});

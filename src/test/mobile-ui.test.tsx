import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import App from '../App';
import type { Career } from '../models';
import { newCareer, prepareWeek } from '../simulation/career';
import { saveCareer, loadCareer } from '../storage';
import { FormationPitch } from '../components/FormationPitch';
import { Modal } from '../components/Modal';
import { TransferMarket } from '../components/TransferMarket';
import { Matchday } from '../components/Matchday';

afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear(); });

it('uses five primary destinations, preserves squad browsing and returns from secondary pages without changing the save', () => {
 const c = newCareer('Mobile manager', 'unknown', 'hull', 1234);
 saveCareer(c); render(<App/>);
 fireEvent.click(screen.getByRole('button', { name: 'Continue career' }));
 const nav = within(screen.getByRole('navigation', { name: 'Primary navigation' }));
 expect(nav.getAllByRole('button').map(el => el.textContent)).toEqual(['Home', 'Squad', 'Market', 'Club', 'League']);
 fireEvent.click(nav.getByRole('button', { name: 'Squad' }));
 fireEvent.click(screen.getByRole('button', { name: 'Players' }));
 fireEvent.click(nav.getByRole('button', { name: 'Club' }));
 fireEvent.click(screen.getByRole('button', { name: /Staff & contracts/ }));
 fireEvent.click(screen.getByRole('button', { name: 'Back' }));
 expect(screen.getByRole('heading', { name: 'Club' })).toBeTruthy();
 fireEvent.click(nav.getByRole('button', { name: 'Squad' }));
 expect(screen.getByRole('button', { name: 'Players' }).getAttribute('aria-pressed')).toBe('true');
 expect(document.querySelectorAll('.roster-card')).toHaveLength(33);
 expect(loadCareer().career).toEqual(c);
},15000);

it('changes all three formations and applies a replacement only after confirmation', () => {
 let latest = newCareer('Test', 'unknown', 'hull', 1234);
 function Harness() { const [c, set] = useState(latest); latest = c; return <FormationPitch career={c} onChange={set}/>; }
 render(<Harness/>);
 for (const formation of ['4-4-2', '4-2-3-1', '4-3-3']) {
  fireEvent.change(screen.getByLabelText('Formation'), { target: { value: formation } });
  expect(latest.formation).toBe(formation);
  expect(document.querySelectorAll('.formation-player')).toHaveLength(11);
  expect(new Set(latest.lineup).size).toBe(11);
 }
 const previous = [...latest.lineup];
 fireEvent.click(document.querySelector('.formation-player')!);
 const dialog = within(screen.getByRole('dialog'));
 const choices = dialog.getAllByRole('button', { pressed: false });
 fireEvent.click(choices.find(el => el.classList.contains('selection-player'))!);
 expect(latest.lineup).toEqual(previous);
 fireEvent.click(dialog.getByRole('button', { name: 'Confirm selection' }));
 expect(screen.queryByRole('dialog')).toBeNull();
 expect(latest.lineup[0]).not.toBe(previous[0]);
 expect(latest.players.find(p => p.id === latest.lineup[0])!.position).toBe('GK');
 expect(new Set(latest.lineup).size).toBe(11);
});

it('traps keyboard focus, supports Escape and restores the opener', async () => {
 function Harness() { const [open, set] = useState(false); return <><button onClick={() => set(true)}>Open sheet</button>{open && <Modal title="Test sheet" onClose={() => set(false)}><input aria-label="Draft"/><button>Last action</button></Modal>}</>; }
 const user = userEvent.setup(); render(<Harness/>);
 const opener = screen.getByRole('button', { name: 'Open sheet' });
 await user.click(opener);
 const close = screen.getByRole('button', { name: 'Close' });
 expect(document.activeElement).toBe(close);
 await user.tab({ shift: true });
 expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Last action' }));
 await user.tab(); expect(document.activeElement).toBe(close);
 await user.keyboard('{Escape}');
 expect(screen.queryByRole('dialog')).toBeNull();
 expect(document.activeElement).toBe(opener);
 expect(document.body.style.overflow).toBe('');
});

it('unlocks body scrolling when a nested confirmation closes both sheets', () => {
 function Harness() {
  const [open, setOpen] = useState(true), [confirm, setConfirm] = useState(false);
  return open && <><Modal title="Profile" onClose={() => setOpen(false)}><button onClick={() => setConfirm(true)}>Review release</button></Modal>{confirm && <Modal title="Confirm release" role="alertdialog" onClose={() => setConfirm(false)}><button onClick={() => setOpen(false)}>Confirm and close both</button></Modal>}</>;
 }
 render(<Harness/>);
 fireEvent.click(screen.getByRole('button', { name: 'Review release' }));
 expect(document.body.style.overflow).toBe('hidden');
 fireEvent.click(screen.getByRole('button', { name: 'Confirm and close both' }));
 expect(screen.queryByRole('dialog')).toBeNull();
 expect(screen.queryByRole('alertdialog')).toBeNull();
 expect(document.body.style.overflow).toBe('');
});

it('keeps search and negotiation drafts through unmount and refresh without completing a transfer', async () => {
 const c = newCareer('Test', 'unknown', 'hull', 1234), user = userEvent.setup();
 function Market() { return <TransferMarket career={c} onChange={() => { throw Error('No transaction should be submitted'); }} onProfile={() => {}}/>; }
 let mounted = render(<Market/>);
 fireEvent.click(screen.getByRole('button', { name: 'Search & filter players' }));
 await user.type(screen.getByLabelText('Search player'), 'xxxxxxxxxxxx');
 await user.keyboard('{Enter}');
 expect(screen.queryByRole('dialog')).toBeNull();
 expect(screen.getByText('No players found')).toBeTruthy();
 mounted.unmount(); mounted = render(<Market/>);
 fireEvent.click(screen.getByRole('button', { name: 'xxxxxxxxxxxx' }));
 expect((screen.getByLabelText('Search player') as HTMLInputElement).value).toBe('xxxxxxxxxxxx');
 await user.clear(screen.getByLabelText('Search player')); await user.keyboard('{Enter}');
 fireEvent.click(screen.getAllByRole('button', { name: 'Approach player' })[0]);
 fireEvent.change(screen.getByLabelText('Transfer fee (£)'), { target: { value: '1230000' } });
 fireEvent.click(screen.getByRole('button', { name: 'Save draft & close' }));
 mounted.unmount(); render(<Market/>);
 fireEvent.click(screen.getAllByRole('button', { name: 'Approach player' })[0]);
 expect((screen.getByLabelText('Transfer fee (£)') as HTMLInputElement).value).toBe('1230000');
 expect(c.world.offers).toHaveLength(0);
});

it('pauses, changes speed, changes rendering and skips without rerolling the pending report', () => {
 let latest = prepareWeek(newCareer('Test', 'unknown', 'hull', 1234), true);
 latest = { ...latest, pending: { ...latest.pending!, paused: true } };
 const reports = structuredClone(latest.pending!.fixtures);
 function Harness() { const [c, set] = useState(latest); latest = c; return <Matchday career={c} onUpdate={set} onStart={() => {}} onCommit={() => {}} onTactics={() => {}}/>; }
 render(<Harness/>);
 fireEvent.click(screen.getByRole('button', { name: '4×' }));
 expect(latest.pending!.speed).toBe(4);
 fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
 expect(latest.pending!.paused).toBe(false);
 fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
 fireEvent.click(screen.getByText('Use text view'));
 expect(document.querySelector('.text-match-view')).toBeTruthy();
 fireEvent.click(screen.getByText('Skip to full time'));
 expect(latest.pending!.minute).toBe(90);
 expect(screen.getByRole('button', { name: 'Finish matchweek & view results' })).toBeTruthy();
 expect(latest.pending!.fixtures).toEqual(reports);
 expect(latest.week).toBe(0);
});

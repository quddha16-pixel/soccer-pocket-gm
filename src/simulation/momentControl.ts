import type { Career, KeyMoment } from '../models';
export const needsDecision=(c:Career,m:KeyMoment)=>m.clubId===c.clubId||m.kind==='corner'&&(c.playableHighlights??true);

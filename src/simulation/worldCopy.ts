import type { World } from '../worldModels';

/** Completed archives are read-only. Copy their outer arrays for appends, while
 * isolating live finances/staff/offers without cloning every historic match. */
export function copyLiveWorld(world:World):World {
 const {history,seasonReviews,domesticHistory,...live}=world;
 return {...structuredClone(live),history:[...history],seasonReviews:seasonReviews?.slice(),domesticHistory:domesticHistory?.slice()};
}

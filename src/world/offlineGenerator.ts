import type { GenerationContext, RoomSpec } from '../types';
import { assembleRoomSpec, generateOfflineDirection } from './roomDirector';

/** Offline rooms are catalog-directed theme assemblies (not freeform meshes). */
export function generateOfflineRoom(ctx: GenerationContext): RoomSpec {
  return assembleRoomSpec(generateOfflineDirection(ctx));
}

export { assembleRoomSpec, generateOfflineDirection, parseRoomDirection } from './roomDirector';
export { catalogPromptSummary, listAssetIds, listThemeIds } from './assetCatalog';

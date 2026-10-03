/**
 * The field → unboxing handoff.
 *
 * The bag stands among the crocus rows in the field scene. At the end of that scene the camera arrives at
 * exactly the framing the unboxing stage opens with, so the unboxing can be layered over the field and
 * the field dissolved away behind the bag without any visible jump.
 */

/** Where the bag stands in the field (field units, ~25 cm each). */
export const BAG_SPOT = { x: 0.55, z: -0.75 };
/** Field units per unboxing unit (unboxing: 10 cm; field: ~25 cm). */
export const BAG_SCALE = 0.4;

/** Opening camera of the unboxing stage (unboxing units, bag at the origin). */
export const UNBOX_CAM0 = { pos: [2.9, 2.5, 5.8] as const, look: [0, 1.15, 0] as const };
export const UNBOX_FOV = { desktop: 34, mobile: 50 };

/**
 * Section overlap. The unboxing section is pulled up over the end of the field section, so for
 * DISSOLVE_VH of scrolling both are pinned: the field holds its last frame while the unboxing fades in on top.
 */
export const FIELD_VH = 860;
export const DISSOLVE_VH = 130;
/** Field progress at which the unboxing pins on top (the field's own story must be finished by then). */
export const FIELD_END = (FIELD_VH - DISSOLVE_VH - 100) / (FIELD_VH - 100);

export const UNBOX_VH = 1550;
/** Unboxing progress over which the field dissolves into the studio. */
export const DISSOLVE_END = (DISSOLVE_VH / (UNBOX_VH - 100)) * 0.9;

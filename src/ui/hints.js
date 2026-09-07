// One-line transient messages near the hotbar ("needs a pickaxe", "no arrows").
import { UI } from '../config.js';

export function showHint(state, text) { state.hint = { text, t: UI.HINT_TIME }; }
export function updateHints(state, dt) { if (state.hint) { state.hint.t -= dt; if (state.hint.t <= 0) state.hint = null; } }

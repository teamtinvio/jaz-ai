// Barrel re-export — all UI primitives from one import.
export * from './theme.js';
export { formatTable, type TableColumn } from './table.js';
export { formatApiError, formatAuthError, formatGenericError, formatWarning } from './error.js';
export { renderOrgBanner } from './banner.js';
export { createProgress } from './progress.js';
export { formatRecord } from './record.js';
export { showPicker, isCancel, type PickerItem, type PickerOptions } from './picker.js';

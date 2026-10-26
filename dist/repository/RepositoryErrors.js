const INVALID_PAGINATION_LIMIT = new Error('Pagination limit must be a non-negative safe integer');
const INVALID_PAGINATION_SKIP = new Error('Pagination skip must be a non-negative safe integer');
const INVALID_MAXIMUM_ENTITY_COUNT = new Error('Maximum entity count must be a non-negative safe integer');
const MAXIMUM_ENTITY_COUNT_REQUIRED = new Error('Cache warm-up failed: Maximum entity count is not defined');
const PAGINATION_LIMIT_EXCEEDS_MAXIMUM = new Error('Pagination limit exceeds maximum entity count');
const ENTITY_COUNT_EXCEEDS_MAXIMUM = new Error('Cache warm-up failed: Entity count exceeds maximum');
const STORAGE_RETURNED_TOO_MANY_ENTITIES = new Error('Storage returned more entities than requested');
export { ENTITY_COUNT_EXCEEDS_MAXIMUM, INVALID_MAXIMUM_ENTITY_COUNT, INVALID_PAGINATION_LIMIT, INVALID_PAGINATION_SKIP, MAXIMUM_ENTITY_COUNT_REQUIRED, PAGINATION_LIMIT_EXCEEDS_MAXIMUM, STORAGE_RETURNED_TOO_MANY_ENTITIES, };
//# sourceMappingURL=RepositoryErrors.js.map
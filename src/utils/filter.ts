import { Creator } from '../domain/models.js';

/**
 * Filter creators based on a search query.
 * Supports partial matching, case-insensitive matching, and multiple keywords (AND logic).
 * Checks against Name, ID, and X Username.
 *
 * @param creators List of creators to filter
 * @param query Search query string
 * @returns Filtered list of creators
 */
export const filterCreators = (creators: Creator[], query?: string): Creator[] => {
    if (!query) {
        return creators;
    }

    const keywords = query.toLowerCase().split(/\s+/);

    return creators.filter((c: Creator) => {
        return keywords.every((keyword) => {
            return (
                c.name.toLowerCase().includes(keyword) ||
                c.id.toLowerCase().includes(keyword) ||
                (c.xUsername && c.xUsername.toLowerCase().includes(keyword))
            );
        });
    });
};

/**
 * Resolve a document URL using NEXT_PUBLIC_BASE_PATH.
 * Centralizes the base-path fallback pattern used across order pages.
 */
export function resolveDocUrl(path: string): string {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    return `${basePath}${path}`;
}
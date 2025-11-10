export const API = {
    GEMINI_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
}

export const RATE_LIMIT = {
    REQUESTS_PER_MINUTE: 5,
    CACHE_MAX_SIZE: 1000,
    CACHE_TTL_MS: 60 * 1000,
};
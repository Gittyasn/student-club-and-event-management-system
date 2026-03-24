import { useState, useCallback } from 'react';

export const useRateLimit = (key, options) => {
    const [isRateLimited, setIsRateLimited] = useState(false);

    const checkRateLimit = useCallback(() => {
        const now = Date.now();
        const storageKey = `rate_limit_${key}`;
        const record = localStorage.getItem(storageKey);

        let data = { timestamp: now, count: 0 };

        if (record) {
            try {
                const parsed = JSON.parse(record);
                if (now - parsed.timestamp < options.windowMs) {
                    data = parsed;
                }
            } catch {
                // reset if error
            }
        }

        if (data.count >= options.maxRequests) {
            setIsRateLimited(true);
            return false;
        }

        data.count++;
        localStorage.setItem(storageKey, JSON.stringify(data));
        setIsRateLimited(false);
        return true;
    }, [key, options]);

    return { checkRateLimit, isRateLimited };
};

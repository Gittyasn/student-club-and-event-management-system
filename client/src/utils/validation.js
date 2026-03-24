import { z } from 'zod';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const ACCEPTED_DOC_TYPES = ["application/pdf"];

/**
 * Validates a file based on size and type.
 * @param file The file to validate
 * @param type 'image' | 'document' | 'all'
 * @returns { valid: boolean, error?: string }
 */
export const validateFile = (file, type = 'all') => {
    if (file.size > MAX_FILE_SIZE) {
        return { valid: false, error: 'File size must be less than 5MB.' };
    }

    let allowedTypes = [];
    if (type === 'image') allowedTypes = ACCEPTED_IMAGE_TYPES;
    else if (type === 'document') allowedTypes = ACCEPTED_DOC_TYPES;
    else allowedTypes = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_DOC_TYPES];

    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: `Invalid file type. Allowed: ${type === 'all' ? 'Images & PDF' : type}` };
    }

    return { valid: true };
};

/**
 * Sanitizes a string input to prevent basic XSS or injection.
 * Removes HTML tags and trims whitespace.
 */
export const sanitizeInput = (input) => {
    return input.replace(/<[^>]*>?/gm, '').trim();
};

export const chatMessageSchema = z.object({
    content: z.string().min(1, "Message cannot be empty").max(1000, "Message too long").transform(sanitizeInput),
    type: z.enum(['text', 'broadcast']).optional()
});

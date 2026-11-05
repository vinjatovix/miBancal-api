export const SUPPORT_RESOURCE_TYPES = ['image', 'article', 'video'] as const;

export type SupportResourceType = (typeof SUPPORT_RESOURCE_TYPES)[number];

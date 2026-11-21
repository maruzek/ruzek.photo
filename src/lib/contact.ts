/** `tel:` link for a phone number written for people ("+420 731 808 342"). */
export const telHref = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, '')}`;

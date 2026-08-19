import { apiRequest } from './api';
import type { LookupItem, LookupType, ServiceOrderLookupOptions } from '@/types/lookup';

export const emptyServiceOrderOptions: ServiceOrderLookupOptions = { units: [], categories: [], systems: [] };
export const loadServiceOrderOptions = () => apiRequest<ServiceOrderLookupOptions>('/lookups/options/service-order');
export const loadActiveLookups = (type: LookupType) => apiRequest<LookupItem[]>(`/lookups/${type}?isActive=true`);

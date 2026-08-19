export type LookupType = 'UNIT' | 'DEPARTMENT' | 'SERVICE_ORDER_CATEGORY' | 'SYSTEM_PROCESS' | 'PROJECT_TYPE' | 'CANCELLATION_REASON';
export type LookupRelatedModule = 'SERVICE_ORDER' | 'PROJECT' | 'TASK';
export interface LookupItem { id:string; type:LookupType; name:string; code?:string|null; description?:string|null; parentId?:string|null; parent?:{id:string;name:string;type:LookupType}|null; relatedModule?:LookupRelatedModule|null; isActive:boolean; sortOrder?:number|null; createdAt:string; updatedAt:string; }
export type LookupInput = Pick<LookupItem,'type'|'name'> & Partial<Pick<LookupItem,'code'|'description'|'parentId'|'relatedModule'|'isActive'|'sortOrder'>>;
export interface ServiceOrderLookupOptions { units:LookupItem[]; categories:LookupItem[]; systems:LookupItem[]; }

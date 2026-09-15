import type {Permission,PermissionSet} from '../contracts.js';
export const DEFAULT_PERMISSIONS:PermissionSet={web:true,files:false,code:false,externalActions:false,sensitiveData:false};
export function canExecute(p:Permission,s:PermissionSet){return s[p]===true}

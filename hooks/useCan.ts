import { AuthContext } from './../context/AuthContext';
import { useContext } from "react";
import { validateUserPermissions } from '../utils/validateUserPermissions';

type UseCanParams = {
  permissions?: string[];
  roles?: string[];
}

export function useCan({permissions, roles}: UseCanParams) {
  const { user, isAuthenticated } = useContext(AuthContext);

  if(!isAuthenticated) {
    return false;
  }

  const userHaValidPermissions = validateUserPermissions({
    user,
    permissions,
    roles
  })

  return userHaValidPermissions;
}
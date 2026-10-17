/**
 * RBAC & Multi-Tenant Isolation Middleware for Meso ERP
 * Roles: OWNER, CHARTERED_ACCOUNTANT, FINANCE_MANAGER, DATA_ENTRY, AUDITOR_READ_ONLY
 */

export const ROLES = {
  OWNER: 'OWNER',
  CHARTERED_ACCOUNTANT: 'CHARTERED_ACCOUNTANT',
  FINANCE_MANAGER: 'FINANCE_MANAGER',
  DATA_ENTRY: 'DATA_ENTRY',
  AUDITOR_READ_ONLY: 'AUDITOR_READ_ONLY'
};

export function multiTenantContext(req, res, next) {
  // Extract company context from header, query, or fallback
  const companyId = req.headers['x-company-id'] || req.query.company_id || req.body?.company_id || 'comp_1';
  req.companyId = companyId;

  // Extract user context from headers or fallback
  const userId = req.headers['x-user-id'] || 'usr_default';
  const userRole = (req.headers['x-user-role'] || 'OWNER').toUpperCase();
  const userName = req.headers['x-user-name'] || 'Authorized User';

  req.user = {
    id: userId,
    role: ROLES[userRole] ? userRole : ROLES.OWNER,
    name: userName,
    companyId
  };

  next();
}

/**
 * Enforces role-based permissions on API routes.
 */
export function requirePermission(requiredAction) {
  return (req, res, next) => {
    const role = req.user?.role || ROLES.OWNER;

    // 1. AUDITOR_READ_ONLY is strictly blocked from any mutation
    if (role === ROLES.AUDITOR_READ_ONLY) {
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Auditor role has strictly read-only access under MCA compliance.'
        });
      }
    }

    // 2. Specific action checks
    if (requiredAction === 'MANAGE_POLICIES' || requiredAction === 'CLOSE_BOOKS') {
      if (![ROLES.OWNER, ROLES.CHARTERED_ACCOUNTANT].includes(role)) {
        return res.status(403).json({
          success: false,
          error: `Forbidden: Only OWNER and CHARTERED_ACCOUNTANT can perform ${requiredAction}.`
        });
      }
    }

    if (requiredAction === 'SOFT_DELETE_OR_VOID') {
      if ([ROLES.AUDITOR_READ_ONLY, ROLES.DATA_ENTRY].includes(role)) {
        return res.status(403).json({
          success: false,
          error: `Forbidden: Role ${role} cannot void or soft-delete financial documents.`
        });
      }
    }

    next();
  };
}

export const extractUserCompany = multiTenantContext;

export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    const role = req.user?.role || ROLES.OWNER;
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Role ${role} is not authorized for this operation.`
      });
    }
    next();
  };
}


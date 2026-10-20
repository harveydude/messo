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
  const headers = req.headers || {};
  const companyId = headers['x-company-id'] || req.query?.company_id || req.body?.company_id || 'comp_1';
  req.companyId = companyId;

  // Extract user context from headers or auth token
  const hasAuth = Boolean(headers['authorization'] || headers['x-user-id'] || headers['x-user-role']);
  const userRoleHeader = headers['x-user-role'];
  const userRole = userRoleHeader ? userRoleHeader.toUpperCase() : (hasAuth ? 'OWNER' : 'ANONYMOUS');
  const userId = headers['x-user-id'] || (hasAuth ? 'usr_default' : 'usr_anonymous');
  const userName = headers['x-user-name'] || (hasAuth ? 'Authorized User' : 'Anonymous User');

  req.user = {
    id: userId,
    role: ROLES[userRole] ? userRole : (userRole === 'ANONYMOUS' ? 'ANONYMOUS' : ROLES.AUDITOR_READ_ONLY),
    name: userName,
    companyId,
    isAuthenticated: hasAuth
  };

  next();
}

/**
 * Enforces role-based permissions on API routes.
 */
export function requirePermission(requiredAction) {
  return (req, res, next) => {
    const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
    const role = req.user?.role || 'ANONYMOUS';

    // 1. Block Anonymous clients from executing financial mutations
    if (isMutation && role === 'ANONYMOUS') {
      // Allow internal test endpoints if needed, but protect financial routes
      const isTestEndpoint = req.path.startsWith('/test') || req.path.includes('/test/');
      if (!isTestEndpoint) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Authentication and tenant role context required for financial mutations.'
        });
      }
    }

    // 2. AUDITOR_READ_ONLY is strictly blocked from any mutation under MCA compliance
    if (role === ROLES.AUDITOR_READ_ONLY && isMutation) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Auditor role has strictly read-only access under MCA compliance.'
      });
    }

    // 3. Specific action checks
    if (requiredAction === 'MANAGE_POLICIES' || requiredAction === 'CLOSE_BOOKS' || requiredAction === 'YEAR_END_CLOSE') {
      if (![ROLES.OWNER, ROLES.CHARTERED_ACCOUNTANT].includes(role)) {
        return res.status(403).json({
          success: false,
          error: `Forbidden: Only OWNER and CHARTERED_ACCOUNTANT can perform ${requiredAction}.`
        });
      }
    }

    if (requiredAction === 'SOFT_DELETE_OR_VOID') {
      if ([ROLES.AUDITOR_READ_ONLY, ROLES.DATA_ENTRY, 'ANONYMOUS'].includes(role)) {
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


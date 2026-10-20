/**
 * Central Error Sanitization Helper for Meso ERP API
 * Prevents raw PostgreSQL/SQL schema, table name, and constraint leaks to external callers.
 */

export function handleApiError(res, err, fallbackMessage = 'An unexpected error occurred while processing the request.') {
  // Always log raw error for internal debugging/monitoring
  console.error('[API Error]:', err?.message || err);

  const status = err?.status || err?.statusCode || 500;

  // Never leak raw database queries, relation names, or postgres error objects to clients
  const isPostgresError = err?.code || (err?.message && (
    err.message.includes('relation') ||
    err.message.includes('column') ||
    err.message.includes('syntax error') ||
    err.message.includes('violates') ||
    err.message.includes('duplicate key') ||
    err.message.includes('null value') ||
    err.message.includes('foreign key') ||
    err.message.includes('pg_') ||
    err.message.includes('select')
  ));

  let clientMessage = fallbackMessage;
  if (!isPostgresError && err?.isSafe && err?.message) {
    clientMessage = err.message;
  } else if (err?.userMessage) {
    clientMessage = err.userMessage;
  }

  return res.status(status).json({
    success: false,
    error: clientMessage
  });
}

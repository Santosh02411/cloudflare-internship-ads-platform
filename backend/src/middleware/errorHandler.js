/**
 * Error Handler Middleware
 */

function errorHandler(error, req, env) {
  console.error('Error:', error);

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    }),
    {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

function createErrorResponse(message, statusCode = 400) {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    }),
    {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

function createSuccessResponse(data, statusCode = 200) {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
    {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

export {
  errorHandler,
  createErrorResponse,
  createSuccessResponse,
};

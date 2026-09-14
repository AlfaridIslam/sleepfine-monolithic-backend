/**
 * Standardized API Response Utility
 * Provides consistent response format across all services
 */

class ApiResponse {
  static success(res, statusCode = 200, message = 'Success', data = null, meta = {}) {
    const response = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      ...meta,
    };

    return res.status(statusCode).json(response);
  }

  static error(res, statusCode = 500, message = 'Internal Server Error', errors = null, meta = {}) {
    const response = {
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString(),
      ...meta,
    };

    return res.status(statusCode).json(response);
  }

  static created(res, message = 'Resource created successfully', data = null, meta = {}) {
    return this.success(res, 201, message, data, meta);
  }

  static noContent(res) {
    return res.status(204).send();
  }

  static badRequest(res, message = 'Bad Request', errors = null) {
    return this.error(res, 400, message, errors);
  }

  static unauthorized(res, message = 'Unauthorized') {
    return this.error(res, 401, message);
  }

  static forbidden(res, message = 'Forbidden') {
    return this.error(res, 403, message);
  }

  static notFound(res, message = 'Resource not found') {
    return this.error(res, 404, message);
  }

  static conflict(res, message = 'Conflict', errors = null) {
    return this.error(res, 409, message, errors);
  }

  static validationError(res, message = 'Validation failed', errors = null) {
    return this.error(res, 422, message, errors);
  }

  static internalError(res, message = 'Internal Server Error', errors = null) {
    return this.error(res, 500, message, errors);
  }

  static serviceUnavailable(res, message = 'Service Unavailable') {
    return this.error(res, 503, message);
  }

  static paginated(res, message = 'Data retrieved successfully', data = [], pagination = {}, meta = {}) {
    const response = {
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: pagination.total || 0,
        totalPages: pagination.totalPages || 0,
        hasNext: pagination.hasNext || false,
        hasPrev: pagination.hasPrev || false,
      },
      timestamp: new Date().toISOString(),
      ...meta,
    };

    return res.status(200).json(response);
  }

  static fileDownload(res, fileBuffer, filename, contentType = 'application/octet-stream') {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    return res.send(fileBuffer);
  }

  static healthCheck(res, healthData = {}) {
    const response = {
      success: true,
      message: 'Service is healthy',
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        ...healthData,
      },
    };

    return res.status(200).json(response);
  }
}

export default ApiResponse;

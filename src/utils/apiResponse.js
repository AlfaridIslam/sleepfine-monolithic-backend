class ApiResponseBuilder {
  constructor(res) {
    this.res = res;
    this._statusCode = 200;
    this._success = true;
    this._message = '';
    this._data = null;
    this._error = null;
  }

  status(code) {
    this._statusCode = code;
    this._success = code < 400;
    return this;
  }

  message(msg) {
    this._message = msg;
    return this;
  }

  data(data) {
    this._data = data;
    return this;
  }

  error(error) {
    this._error = error;
    this._success = false;
    return this;
  }

  send() {
    const response = {
      success: this._success,
      statusCode: this._statusCode
    };

    if (this._message) {
      response.message = this._message;
    }

    if (this._data !== null && this._data !== undefined) {
      response.data = this._data;
    }

    if (this._error) {
      response.error = this._error;
    }

    if (!this._success && !this._message && this._error) {
      response.message = this._error;
    }

    return this.res.status(this._statusCode).json(response);
  }
}

class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export { ApiResponse };
export default ApiResponseBuilder;

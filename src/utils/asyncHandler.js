// Async handler to wrap async route functions and catch errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export { asyncHandler };
export default asyncHandler;

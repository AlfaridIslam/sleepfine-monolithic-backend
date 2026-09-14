import mongoose from 'mongoose';
import logger from './logger.js';

/**
 * Executes a callback within a MongoDB session transaction.
 * If the MongoDB instance is a standalone server (does not support replica set transactions),
 * it gracefully falls back to executing the callback without a transaction session.
 *
 * @param {Function} operation - Async function receiving (session)
 * @returns {Promise<any>}
 */
export const runInTransaction = async (operation) => {
  let session = null;
  try {
    session = await mongoose.startSession();
    let result;
    try {
      await session.withTransaction(async (tSession) => {
        result = await operation(tSession);
      });
      return result;
    } catch (err) {
      // Check for standalone MongoDB error: code 20 "Transaction numbers are only allowed on a replica set member or mongos"
      if (err.code === 20 || (err.message && err.message.includes('replica set'))) {
        logger.debug('MongoDB standalone detected; executing workflow directly without session');
        await session.endSession();
        session = null;
        return await operation(null);
      }
      throw err;
    }
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

export default {
  runInTransaction,
};

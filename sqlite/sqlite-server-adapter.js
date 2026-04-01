import { query, pool } from '../api/config/db.js'

export const DbAdapter = {
  connect: async function () {
    return pool
  },

  query: async function (sql, params = []) {
    return query(sql, params)
  },

  disconnect: async function () {
    return true
  }
}

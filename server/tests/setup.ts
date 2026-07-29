import { testDatabaseUrl } from './test-db'

process.env.DATABASE_URL = testDatabaseUrl()
process.env.NODE_ENV = 'test'
process.env.EMAIL_DEV_LOG = 'true'
process.env.LOG_LEVEL = 'silent'

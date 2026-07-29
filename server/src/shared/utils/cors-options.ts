import { corsOrigins, isProduction } from 'config/env'
import type { CorsOptions } from 'cors'

export const corsOptions: CorsOptions = {
  origin: corsOrigins.length > 0 ? corsOrigins : !isProduction,
  credentials: true,
}

export const socketCorsOptions = {
  origin: corsOrigins.length > 0 ? corsOrigins : true,
  credentials: true,
}

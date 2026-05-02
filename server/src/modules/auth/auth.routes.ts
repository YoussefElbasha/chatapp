import { Router } from 'express'
import { authHandler as authMiddleware } from './../../shared/middlewares/auth.middleware'

import {
  getMeController,
  loginController,
  logoutController,
  refreshTokenController,
  registerController,
} from './auth.controller'

const router = Router()

router.post('/register', registerController)
router.post('/login', loginController)
router.post('/logout', logoutController)
router.post('/logout-all', logoutController)
router.post('/refresh', refreshTokenController)
router.get('/me', authMiddleware, getMeController)

export default router

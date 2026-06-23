import { Router } from 'express'
import { authHandler as authMiddleware } from './../../shared/middlewares/auth.middleware'
import {
  authLimiter,
  changePasswordLimiter,
  loginEmailLimiter,
  refreshLimiter,
  registerEmailLimiter,
} from 'shared/middlewares/rate-limit.middleware'

import {
  changePasswordController,
  getMeController,
  loginController,
  logoutAllController,
  logoutController,
  refreshTokenController,
  registerController,
} from './auth.controller'

const router = Router()

router.post('/register', authLimiter, registerEmailLimiter, registerController)
router.post('/login', authLimiter, loginEmailLimiter, loginController)
router.post('/logout', logoutController)
router.post('/logout-all', authMiddleware, logoutAllController)
router.post('/change-password', authMiddleware, changePasswordLimiter, changePasswordController)
router.post('/refresh', refreshLimiter, refreshTokenController)
router.get('/me', authMiddleware, getMeController)

export default router

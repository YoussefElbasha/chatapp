import { Router } from 'express'
import {
  changePasswordLimiter,
  forgotPasswordEmailLimiter,
  forgotPasswordIpLimiter,
  loginEmailLimiter,
  loginIpLimiter,
  refreshLimiter,
  registerEmailLimiter,
  registerIpLimiter,
  resetPasswordIpLimiter,
} from 'shared/middlewares/rate-limit.middleware'

import { authHandler as authMiddleware } from './../../shared/middlewares/auth.middleware'
import {
  changePasswordController,
  forgotPasswordController,
  getMeController,
  loginController,
  logoutAllController,
  logoutController,
  refreshTokenController,
  registerController,
  resetPasswordController,
} from './auth.controller'

const router = Router()

router.post('/register', registerIpLimiter, registerEmailLimiter, registerController)
router.post('/login', loginIpLimiter, loginEmailLimiter, loginController)
router.post('/forgot-password', forgotPasswordIpLimiter, forgotPasswordEmailLimiter, forgotPasswordController)

router.post('/reset-password', resetPasswordIpLimiter, resetPasswordController)

router.post('/logout', logoutController)
router.post('/logout-all', authMiddleware, logoutAllController)
router.post('/change-password', authMiddleware, changePasswordLimiter, changePasswordController)
router.post('/refresh', refreshLimiter, refreshTokenController)
router.get('/me', authMiddleware, getMeController)

export default router

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
  resendVerificationIpLimiter,
  resendVerificationLimiter,
  resetPasswordIpLimiter,
  verifyEmailLimiter,
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
  resendVerificationController,
  resetPasswordController,
  verifyEmailController,
} from './auth.controller'

const router = Router()

router.post('/register', registerIpLimiter, registerEmailLimiter, registerController)
router.post('/login', loginIpLimiter, loginEmailLimiter, loginController)
router.post('/forgot-password', forgotPasswordIpLimiter, forgotPasswordEmailLimiter, forgotPasswordController)

router.post('/reset-password', resetPasswordIpLimiter, resetPasswordController)

router.post('/verify-email', verifyEmailLimiter, verifyEmailController)
router.post(
  '/resend-verification',
  resendVerificationIpLimiter,
  resendVerificationLimiter,
  resendVerificationController,
)

router.post('/logout', logoutController)
router.post('/logout-all', authMiddleware, logoutAllController)
router.post('/change-password', authMiddleware, changePasswordLimiter, changePasswordController)
router.post('/refresh', refreshLimiter, refreshTokenController)
router.get('/me', authMiddleware, getMeController)

export default router

import { Router } from 'express'
import { getUserByIdController } from 'modules/user/user.controller'
import { authHandler as authMiddleware } from 'shared/middlewares/auth.middleware'

const router = Router()

router.get('/:id', authMiddleware, getUserByIdController)

export default router

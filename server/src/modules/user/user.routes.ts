import { Router } from 'express'
import { getUserByIdController, getUsersController } from 'modules/user/user.controller'

const router = Router()

router.get('/', getUsersController)
router.get('/:id', getUserByIdController)

export default router

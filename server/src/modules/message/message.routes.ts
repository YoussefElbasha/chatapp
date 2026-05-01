import { Router } from 'express'
import { createMessageController } from 'modules/message/message.controller'

const router = Router()

router.post('/create-message', createMessageController)

export default router

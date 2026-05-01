import { Router } from 'express'
import { findOrCreateDMRoomController } from 'modules/room/room.controller'

const router = Router()

router.post('/find-or-create-dm-room', findOrCreateDMRoomController)

export default router

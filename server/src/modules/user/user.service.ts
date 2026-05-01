import { AppError } from 'shared/utils/errors/app-error'

import { mapUserDbToUser } from './user.mapper'
import { deleteUserById, findAllUsers, findUserById, findUsersByServerId } from './user.repository'
import type { User } from './user.types'

export const getUserByIdService = async (id: string): Promise<User> => {
  const user = await findUserById(id)

  if (!user) throw new AppError(`No user found with this ID: ${id}`, 404)

  return mapUserDbToUser(user)
}

export const getUsersService = async (): Promise<User[]> => {
  const users = await findAllUsers()

  if (users.length === 0) throw new AppError('No users found', 404)

  return users.map(mapUserDbToUser)
}

export const deleteUserService = async (id: string): Promise<void> => {
  const user = await findUserById(id)

  if (!user) throw new AppError(`No user found with this ID: ${id}`, 404)

  await deleteUserById(id)
}

export const getServerUsersService = async (serverId: string): Promise<User[]> => {
  const users = await findUsersByServerId(serverId)

  if (users.length === 0) throw new AppError(`No members found for server ID: ${serverId}`, 404)

  return users.map(mapUserDbToUser)
}

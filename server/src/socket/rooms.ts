export const createDmRoomId = (userAId: string, userBId: string): string => {
  const [a, b] = [userAId, userBId].sort()
  return `dm:${a}:${b}`
}

export const createChannelRoomId = (serverId: string, channelId: string): string =>
  `server:${serverId}:channel:${channelId}`

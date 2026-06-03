import { relations } from "drizzle-orm/relations";
import { servers, rooms, users, messages, friendRequests, invites, refreshTokens, passwordHistory, tokens, roomMembers, friends, serverMembers } from "./index";

export const roomsRelations = relations(rooms, ({one, many}) => ({
	server: one(servers, {
		fields: [rooms.serverId],
		references: [servers.id]
	}),
	user: one(users, {
		fields: [rooms.ownerId],
		references: [users.id]
	}),
	messages: many(messages),
	roomMembers: many(roomMembers),
}));

export const serversRelations = relations(servers, ({one, many}) => ({
	rooms: many(rooms),
	user: one(users, {
		fields: [servers.ownerId],
		references: [users.id]
	}),
	serverMembers: many(serverMembers),
}));

export const usersRelations = relations(users, ({many}) => ({
	rooms: many(rooms),
	servers: many(servers),
	messages: many(messages),
	friendRequests_senderId: many(friendRequests, {
		relationName: "friendRequests_senderId_users_id"
	}),
	friendRequests_receiverId: many(friendRequests, {
		relationName: "friendRequests_receiverId_users_id"
	}),
	invites: many(invites),
	refreshTokens: many(refreshTokens),
	passwordHistories: many(passwordHistory),
	tokens: many(tokens),
	roomMembers: many(roomMembers),
	friends_user1Id: many(friends, {
		relationName: "friends_user1Id_users_id"
	}),
	friends_user2Id: many(friends, {
		relationName: "friends_user2Id_users_id"
	}),
	serverMembers: many(serverMembers),
}));

export const messagesRelations = relations(messages, ({one}) => ({
	room: one(rooms, {
		fields: [messages.roomId],
		references: [rooms.id]
	}),
	user: one(users, {
		fields: [messages.userId],
		references: [users.id]
	}),
}));

export const friendRequestsRelations = relations(friendRequests, ({one}) => ({
	user_senderId: one(users, {
		fields: [friendRequests.senderId],
		references: [users.id],
		relationName: "friendRequests_senderId_users_id"
	}),
	user_receiverId: one(users, {
		fields: [friendRequests.receiverId],
		references: [users.id],
		relationName: "friendRequests_receiverId_users_id"
	}),
}));

export const invitesRelations = relations(invites, ({one}) => ({
	user: one(users, {
		fields: [invites.createdBy],
		references: [users.id]
	}),
}));

export const refreshTokensRelations = relations(refreshTokens, ({one}) => ({
	user: one(users, {
		fields: [refreshTokens.userId],
		references: [users.id]
	}),
}));

export const passwordHistoryRelations = relations(passwordHistory, ({one}) => ({
	user: one(users, {
		fields: [passwordHistory.userId],
		references: [users.id]
	}),
}));

export const tokensRelations = relations(tokens, ({one}) => ({
	user: one(users, {
		fields: [tokens.userId],
		references: [users.id]
	}),
}));

export const roomMembersRelations = relations(roomMembers, ({one}) => ({
	room: one(rooms, {
		fields: [roomMembers.roomId],
		references: [rooms.id]
	}),
	user: one(users, {
		fields: [roomMembers.userId],
		references: [users.id]
	}),
}));

export const friendsRelations = relations(friends, ({one}) => ({
	user_user1Id: one(users, {
		fields: [friends.user1Id],
		references: [users.id],
		relationName: "friends_user1Id_users_id"
	}),
	user_user2Id: one(users, {
		fields: [friends.user2Id],
		references: [users.id],
		relationName: "friends_user2Id_users_id"
	}),
}));

export const serverMembersRelations = relations(serverMembers, ({one}) => ({
	server: one(servers, {
		fields: [serverMembers.serverId],
		references: [servers.id]
	}),
	user: one(users, {
		fields: [serverMembers.userId],
		references: [users.id]
	}),
}));
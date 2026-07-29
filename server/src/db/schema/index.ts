import { sql } from 'drizzle-orm'
import {
  bigint,
  bigserial,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const tokenType = pgEnum('token_type', ['password_reset', 'email_verification'])

export const rooms = pgTable(
  'rooms',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: varchar({ length: 100 }),
    description: text(),
    serverId: uuid('server_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    type: text().notNull(),
    totalMembers: integer('total_members'),
    maxMembers: integer('max_members'),
    ownerId: uuid('owner_id'),
  },
  (table) => [
    index('idx_channels_server').using('btree', table.serverId.asc().nullsLast().op('uuid_ops')),
    foreignKey({
      columns: [table.serverId],
      foreignColumns: [servers.id],
      name: 'channels_server_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.ownerId],
      foreignColumns: [users.id],
      name: 'rooms_owner_fkey',
    }).onDelete('set null'),
    check(
      'group_dm_requires_owner',
      sql`((type = 'GROUP_DM'::text) AND (owner_id IS NOT NULL)) OR ((type <> 'GROUP_DM'::text) AND (owner_id IS NULL))`,
    ),
    check(
      'server_channel_requires_server',
      sql`((type = ANY (ARRAY['SERVER_TEXT_CHANNEL'::text, 'SERVER_VOICE_CHANNEL'::text])) AND (server_id IS NOT NULL)) OR ((type = ANY (ARRAY['DM'::text, 'GROUP_DM'::text])) AND (server_id IS NULL))`,
    ),
    check(
      'voice_channel_members_check',
      sql`((type = 'SERVER_VOICE_CHANNEL'::text) AND (total_members IS NOT NULL) AND (max_members IS NOT NULL)) OR (type <> 'SERVER_VOICE_CHANNEL'::text)`,
    ),
    check(
      'rooms_type_check',
      sql`type = ANY (ARRAY['DM'::text, 'GROUP_DM'::text, 'SERVER_TEXT_CHANNEL'::text, 'SERVER_VOICE_CHANNEL'::text])`,
    ),
  ],
)

export const servers = pgTable(
  'servers',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: varchar({ length: 100 }).notNull(),
    description: text(),
    iconUrl: text('icon_url'),
    ownerId: uuid('owner_id').notNull(),
    isPublic: boolean('is_public').default(true).notNull(),
    inviteCode: varchar('invite_code', { length: 20 }),
    totalMembers: integer('total_members').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.ownerId],
      foreignColumns: [users.id],
      name: 'servers_owner_id_fkey',
    }).onDelete('restrict'),
    unique('servers_invite_code_key').on(table.inviteCode),
  ],
)

export const messages = pgTable(
  'messages',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'messages_id_seq', startWith: 1, increment: 1, minValue: 1, cache: 1 }),
    roomId: uuid('room_id').notNull(),
    userId: uuid('user_id').notNull(),
    content: text().notNull(),
    embeds: jsonb(),
    isEdited: boolean('is_edited').default(false).notNull(),
    isDeleted: boolean('is_deleted').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_messages_channel').using(
      'btree',
      table.roomId.asc().nullsLast().op('timestamptz_ops'),
      table.createdAt.desc().nullsFirst().op('timestamptz_ops'),
    ),
    foreignKey({
      columns: [table.roomId],
      foreignColumns: [rooms.id],
      name: 'messages_channel_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'messages_user_id_fkey',
    }).onDelete('restrict'),
  ],
)

export const users = pgTable(
  'users',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    email: varchar({ length: 255 }).notNull(),
    username: varchar({ length: 32 }).notNull(),
    discriminator: varchar({ length: 4 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    displayName: varchar('display_name', { length: 32 }),
    avatarUrl: text('avatar_url'),
    bio: text(),
    status: varchar({ length: 20 }).default('offline'),
    emailVerified: boolean('email_verified').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true, mode: 'date' }),
    lastLogoutAt: timestamp('last_logout_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    uniqueIndex('users_email_lower_idx').using('btree', sql`lower(email::text)`),
    unique('users_email_key').on(table.email),
    unique('users_username_discriminator_key').on(table.username, table.discriminator),
    check('email_basic_format', sql`(email)::text ~* '^[^\\s@]+@[A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)+$'::text`),
  ],
)

export const friendRequests = pgTable(
  'friend_requests',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    senderId: uuid('sender_id'),
    receiverId: uuid('receiver_id'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.senderId],
      foreignColumns: [users.id],
      name: 'friend_requests_sender_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.receiverId],
      foreignColumns: [users.id],
      name: 'friend_requests_receiver_id_fkey',
    }).onDelete('cascade'),
    unique('friend_requests_sender_id_receiver_id_key').on(table.senderId, table.receiverId),
  ],
)

export const invites = pgTable(
  'invites',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    code: text().notNull(),
    targetType: text('target_type'),
    targetId: uuid('target_id').notNull(),
    createdBy: uuid('created_by'),
    maxUses: integer('max_uses'),
    uses: integer().default(0),
    expiresAt: timestamp('expires_at', { mode: 'date' }).default(sql`(now() + '24:00:00'::interval)`),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: 'invites_created_by_fkey',
    }),
    unique('invites_code_key').on(table.code),
    check('invites_target_type_check', sql`target_type = ANY (ARRAY['SERVER'::text, 'GROUP_DM'::text])`),
  ],
)

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_refresh_tokens_token_hash').using('btree', table.tokenHash.asc().nullsLast().op('text_ops')),
    index('idx_refresh_tokens_user_id').using('btree', table.userId.asc().nullsLast().op('uuid_ops')),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'refresh_tokens_user_id_fkey',
    }).onDelete('cascade'),
    unique('refresh_tokens_token_hash_key').on(table.tokenHash),
  ],
)

export const passwordHistory = pgTable(
  'password_history',
  {
    id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('password_history_user_created_idx').using(
      'btree',
      table.userId.asc().nullsLast().op('timestamptz_ops'),
      table.createdAt.desc().nullsFirst().op('timestamptz_ops'),
    ),
    uniqueIndex('password_history_user_hash_unique').using(
      'btree',
      table.userId.asc().nullsLast().op('text_ops'),
      table.passwordHash.asc().nullsLast().op('text_ops'),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'password_history_user_id_fkey',
    }).onDelete('cascade'),
  ],
)

export const tokens = pgTable(
  'tokens',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true, mode: 'date' }),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    type: tokenType().notNull(),
  },
  (table) => [
    index('idx_tokens_user_id').using('btree', table.userId.asc().nullsLast().op('uuid_ops')),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'fk_tokens_user',
    }).onDelete('cascade'),
    unique('tokens_token_hash_key').on(table.tokenHash),
    check('chk_expires_at_future', sql`expires_at > created_at`),
  ],
)

export const roomMembers = pgTable(
  'room_members',
  {
    roomId: uuid('room_id').notNull(),
    userId: uuid('user_id').notNull(),
    joinedAt: timestamp('joined_at', { mode: 'date' }).defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.roomId],
      foreignColumns: [rooms.id],
      name: 'room_members_room_id_fkey',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'room_members_user_id_fkey',
    }),
    primaryKey({ columns: [table.userId, table.roomId], name: 'room_members_pkey' }),
  ],
)

export const friends = pgTable(
  'friends',
  {
    user1Id: uuid('user1_id').notNull(),
    user2Id: uuid('user2_id').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  },
  (table) => [
    index('idx_friends_user1').using('btree', table.user1Id.asc().nullsLast().op('uuid_ops')),
    index('idx_friends_user2').using('btree', table.user2Id.asc().nullsLast().op('uuid_ops')),
    foreignKey({
      columns: [table.user1Id],
      foreignColumns: [users.id],
      name: 'friends_user1_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.user2Id],
      foreignColumns: [users.id],
      name: 'friends_user2_id_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.user2Id, table.user1Id], name: 'friends_pkey' }),
    check('friends_check', sql`user1_id < user2_id`),
  ],
)

export const serverMembers = pgTable(
  'server_members',
  {
    serverId: uuid('server_id').notNull(),
    userId: uuid('user_id').notNull(),
    nickname: varchar({ length: 32 }),
    joinedAt: timestamp('joined_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_server_members_user').using('btree', table.userId.asc().nullsLast().op('uuid_ops')),
    foreignKey({
      columns: [table.serverId],
      foreignColumns: [servers.id],
      name: 'server_members_server_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'server_members_user_id_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.userId, table.serverId], name: 'server_members_pkey' }),
  ],
)

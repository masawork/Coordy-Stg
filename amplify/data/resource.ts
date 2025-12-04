import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/**
 * Coordy データスキーマ定義 (MVP版)
 *
 * モデル:
 * - User: ユーザー情報
 * - Instructor: インストラクター詳細
 * - Service: 提供サービス
 * - Reservation: 予約
 * - Todo: TODO管理
 * - ClientProfile: クライアント拡張情報
 * - ClientWallet: ポイント残高
 * - PointTransaction: ポイント取引履歴
 * - FavoriteCreator: お気に入りクリエイター
 */
const schema = a.schema({
  /**
   * ユーザー情報
   * Cognitoユーザーと1:1で紐づく
   */
  User: a
    .model({
      userId: a.id().required(), // Cognito User ID
      email: a.email().required(),
      name: a.string().required(),
      role: a.enum(['user', 'instructor', 'admin']),
      point: a.integer().default(0), // 残高ポイント
      membership: a.string(), // enum は default をサポートしないため string に変更

      // リレーション
      instructor: a.hasOne('Instructor', 'userId'),
      reservations: a.hasMany('Reservation', 'userId'),
      todos: a.hasMany('Todo', 'userId'),
    })
    .authorization((allow) => [
      allow.owner(), // 自分のデータのみアクセス可能
      allow.authenticated().to(['read']), // 認証済みユーザーは読み取り可能
    ]),

  /**
   * インストラクター詳細情報
   * Userから拡張される形で1:1
   */
  Instructor: a
    .model({
      userId: a.id().required(), // UserテーブルのuserId
      displayName: a.string().required(),
      bio: a.string(),
      specialties: a.string().array(), // 専門分野
      profileImage: a.url(),
      hourlyRate: a.integer(), // 時給
      rating: a.float().default(0),
      reviewCount: a.integer().default(0),
      status: a.string(), // enum は default をサポートしないため string に変更

      // 身分証明書関連（追加）
      identityDocumentUrl: a.string(), // 身分証明書のS3 URL
      identityDocumentStatus: a.string().default('notSubmitted'), // 'notSubmitted' | 'pending' | 'approved' | 'rejected'
      identityDocumentSubmittedAt: a.datetime(), // 提出日時
      identityDocumentApprovedAt: a.datetime(), // 承認日時
      identityDocumentRejectionReason: a.string(), // 却下理由

      // リレーション
      user: a.belongsTo('User', 'userId'),
      services: a.hasMany('Service', 'instructorId'),
    })
    .authorization((allow) => [
      allow.owner(), // 自分のデータのみ編集可能
      allow.authenticated().to(['read']), // 認証済みユーザーは読み取り可能
    ]),

  /**
   * サービス（クラス・レッスン）
   */
  Service: a
    .model({
      instructorId: a.id().required(),
      title: a.string().required(),
      description: a.string(),
      category: a.string().required(), // enum は required をサポートしないため string に変更
      duration: a.integer().required(), // 所要時間（分）
      basePrice: a.integer().required(), // 基本価格
      currency: a.string().default('JPY'),
      maxParticipants: a.integer().default(1),
      image: a.url(),
      tags: a.string().array(),
      status: a.string(), // enum は default をサポートしないため string に変更

      // リレーション
      instructor: a.belongsTo('Instructor', 'instructorId'),
      reservations: a.hasMany('Reservation', 'serviceId'),
    })
    .authorization((allow) => [
      allow.owner(), // オーナー（インストラクター）のみ編集可能
      allow.authenticated().to(['read']), // 認証済みユーザーは読み取り可能
    ]),

  /**
   * 予約情報
   */
  Reservation: a
    .model({
      userId: a.id().required(),
      serviceId: a.id().required(),
      instructorId: a.id().required(),
      startTime: a.datetime().required(),
      endTime: a.datetime().required(),
      participants: a.integer().default(1),
      status: a.string(), // enum は default をサポートしないため string に変更
      price: a.integer().required(),
      notes: a.string(),

      // リレーション
      user: a.belongsTo('User', 'userId'),
      service: a.belongsTo('Service', 'serviceId'),
    })
    .authorization((allow) => [
      allow.owner(), // 予約したユーザー本人
      allow.authenticated().to(['read']), // インストラクターも見られるように
    ]),

  /**
   * TODO管理
   */
  Todo: a
    .model({
      userId: a.id().required(),
      title: a.string().required(),
      description: a.string(),
      date: a.date(),
      priority: a.string(), // enum は default をサポートしないため string に変更
      category: a.string(),
      isCompleted: a.boolean().default(false),
      relatedReservationId: a.id(), // 関連する予約ID

      // リレーション
      user: a.belongsTo('User', 'userId'),
    })
    .authorization((allow) => [
      allow.owner(), // 自分のTODOのみアクセス可能
    ]),

  /**
   * クライアントプロフィール（拡張情報）
   */
  ClientProfile: a
    .model({
      clientId: a.id().required(), // Cognito User ID
      name: a.string().required(),
      address: a.string(), // 住所（既存）
      phoneNumber: a.phone(), // 電話番号（phone型に変更）
      dateOfBirth: a.date(),
      gender: a.string(),
      isProfileComplete: a.boolean().default(false),

      // テーマカラー（追加）
      themeColor: a.string().default('purple'), // 'purple' | 'blue' | 'green' | 'orange' | 'pink'
    })
    .authorization((allow) => [
      allow.authenticated(), // 認証済みユーザーは自分のプロフィールにアクセス可能
    ]),

  /**
   * クライアントウォレット（ポイント残高）
   */
  ClientWallet: a
    .model({
      clientId: a.id().required(),
      balance: a.integer().default(0),
    })
    .authorization((allow) => [
      allow.owner(), // 自分のウォレットのみアクセス可能
    ]),

  /**
   * ポイント取引履歴
   */
  PointTransaction: a
    .model({
      clientId: a.id().required(),
      type: a.string().required(), // 'charge' | 'use' | 'expired'
      amount: a.integer().required(),
      method: a.string(), // 'credit' | 'bankTransfer'
      status: a.string().default('completed'), // 'pending' | 'completed' | 'failed'
      description: a.string(),
      expiresAt: a.datetime(), // ポイント有効期限（chargeの場合のみ）
    })
    .authorization((allow) => [
      allow.owner(), // 自分の取引履歴のみアクセス可能
    ]),

  /**
   * お気に入りクリエイター
   */
  FavoriteCreator: a
    .model({
      clientId: a.id().required(),
      instructorId: a.id().required(),
    })
    .authorization((allow) => [
      allow.owner(), // 自分のお気に入りのみアクセス可能
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool", // Cognito認証をデフォルトに変更
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>

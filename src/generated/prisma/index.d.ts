
/**
 * Client
**/

import * as runtime from './runtime/client.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model Website
 * 
 */
export type Website = $Result.DefaultSelection<Prisma.$WebsitePayload>
/**
 * Model WebsiteMetric
 * 
 */
export type WebsiteMetric = $Result.DefaultSelection<Prisma.$WebsiteMetricPayload>
/**
 * Model SSLCertificate
 * 
 */
export type SSLCertificate = $Result.DefaultSelection<Prisma.$SSLCertificatePayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient({
 *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
 * })
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient({
   *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
   * })
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://pris.ly/d/client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/orm/prisma-client/queries/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>

  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.website`: Exposes CRUD operations for the **Website** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Websites
    * const websites = await prisma.website.findMany()
    * ```
    */
  get website(): Prisma.WebsiteDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.websiteMetric`: Exposes CRUD operations for the **WebsiteMetric** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more WebsiteMetrics
    * const websiteMetrics = await prisma.websiteMetric.findMany()
    * ```
    */
  get websiteMetric(): Prisma.WebsiteMetricDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.sSLCertificate`: Exposes CRUD operations for the **SSLCertificate** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more SSLCertificates
    * const sSLCertificates = await prisma.sSLCertificate.findMany()
    * ```
    */
  get sSLCertificate(): Prisma.SSLCertificateDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 7.8.0
   * Query Engine version: 3c6e192761c0362d496ed980de936e2f3cebcd3a
   */
  export type PrismaVersion = {
    client: string
    engine: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    Website: 'Website',
    WebsiteMetric: 'WebsiteMetric',
    SSLCertificate: 'SSLCertificate'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]



  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "user" | "website" | "websiteMetric" | "sSLCertificate"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      Website: {
        payload: Prisma.$WebsitePayload<ExtArgs>
        fields: Prisma.WebsiteFieldRefs
        operations: {
          findUnique: {
            args: Prisma.WebsiteFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WebsitePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.WebsiteFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WebsitePayload>
          }
          findFirst: {
            args: Prisma.WebsiteFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WebsitePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.WebsiteFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WebsitePayload>
          }
          findMany: {
            args: Prisma.WebsiteFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WebsitePayload>[]
          }
          create: {
            args: Prisma.WebsiteCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WebsitePayload>
          }
          createMany: {
            args: Prisma.WebsiteCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.WebsiteCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WebsitePayload>[]
          }
          delete: {
            args: Prisma.WebsiteDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WebsitePayload>
          }
          update: {
            args: Prisma.WebsiteUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WebsitePayload>
          }
          deleteMany: {
            args: Prisma.WebsiteDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.WebsiteUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.WebsiteUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WebsitePayload>[]
          }
          upsert: {
            args: Prisma.WebsiteUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WebsitePayload>
          }
          aggregate: {
            args: Prisma.WebsiteAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateWebsite>
          }
          groupBy: {
            args: Prisma.WebsiteGroupByArgs<ExtArgs>
            result: $Utils.Optional<WebsiteGroupByOutputType>[]
          }
          count: {
            args: Prisma.WebsiteCountArgs<ExtArgs>
            result: $Utils.Optional<WebsiteCountAggregateOutputType> | number
          }
        }
      }
      WebsiteMetric: {
        payload: Prisma.$WebsiteMetricPayload<ExtArgs>
        fields: Prisma.WebsiteMetricFieldRefs
        operations: {
          findUnique: {
            args: Prisma.WebsiteMetricFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WebsiteMetricPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.WebsiteMetricFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WebsiteMetricPayload>
          }
          findFirst: {
            args: Prisma.WebsiteMetricFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WebsiteMetricPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.WebsiteMetricFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WebsiteMetricPayload>
          }
          findMany: {
            args: Prisma.WebsiteMetricFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WebsiteMetricPayload>[]
          }
          create: {
            args: Prisma.WebsiteMetricCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WebsiteMetricPayload>
          }
          createMany: {
            args: Prisma.WebsiteMetricCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.WebsiteMetricCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WebsiteMetricPayload>[]
          }
          delete: {
            args: Prisma.WebsiteMetricDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WebsiteMetricPayload>
          }
          update: {
            args: Prisma.WebsiteMetricUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WebsiteMetricPayload>
          }
          deleteMany: {
            args: Prisma.WebsiteMetricDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.WebsiteMetricUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.WebsiteMetricUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WebsiteMetricPayload>[]
          }
          upsert: {
            args: Prisma.WebsiteMetricUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WebsiteMetricPayload>
          }
          aggregate: {
            args: Prisma.WebsiteMetricAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateWebsiteMetric>
          }
          groupBy: {
            args: Prisma.WebsiteMetricGroupByArgs<ExtArgs>
            result: $Utils.Optional<WebsiteMetricGroupByOutputType>[]
          }
          count: {
            args: Prisma.WebsiteMetricCountArgs<ExtArgs>
            result: $Utils.Optional<WebsiteMetricCountAggregateOutputType> | number
          }
        }
      }
      SSLCertificate: {
        payload: Prisma.$SSLCertificatePayload<ExtArgs>
        fields: Prisma.SSLCertificateFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SSLCertificateFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SSLCertificatePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SSLCertificateFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SSLCertificatePayload>
          }
          findFirst: {
            args: Prisma.SSLCertificateFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SSLCertificatePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SSLCertificateFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SSLCertificatePayload>
          }
          findMany: {
            args: Prisma.SSLCertificateFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SSLCertificatePayload>[]
          }
          create: {
            args: Prisma.SSLCertificateCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SSLCertificatePayload>
          }
          createMany: {
            args: Prisma.SSLCertificateCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SSLCertificateCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SSLCertificatePayload>[]
          }
          delete: {
            args: Prisma.SSLCertificateDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SSLCertificatePayload>
          }
          update: {
            args: Prisma.SSLCertificateUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SSLCertificatePayload>
          }
          deleteMany: {
            args: Prisma.SSLCertificateDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SSLCertificateUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SSLCertificateUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SSLCertificatePayload>[]
          }
          upsert: {
            args: Prisma.SSLCertificateUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SSLCertificatePayload>
          }
          aggregate: {
            args: Prisma.SSLCertificateAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSSLCertificate>
          }
          groupBy: {
            args: Prisma.SSLCertificateGroupByArgs<ExtArgs>
            result: $Utils.Optional<SSLCertificateGroupByOutputType>[]
          }
          count: {
            args: Prisma.SSLCertificateCountArgs<ExtArgs>
            result: $Utils.Optional<SSLCertificateCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://pris.ly/d/logging).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory
    /**
     * Prisma Accelerate URL allowing the client to connect through Accelerate instead of a direct database.
     */
    accelerateUrl?: string
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
    /**
     * SQL commenter plugins that add metadata to SQL queries as comments.
     * Comments follow the sqlcommenter format: https://google.github.io/sqlcommenter/
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   adapter,
     *   comments: [
     *     traceContext(),
     *     queryInsights(),
     *   ],
     * })
     * ```
     */
    comments?: runtime.SqlCommenterPlugin[]
  }
  export type GlobalOmitConfig = {
    user?: UserOmit
    website?: WebsiteOmit
    websiteMetric?: WebsiteMetricOmit
    sSLCertificate?: SSLCertificateOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    websites: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    websites?: boolean | UserCountOutputTypeCountWebsitesArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountWebsitesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: WebsiteWhereInput
  }


  /**
   * Count Type WebsiteCountOutputType
   */

  export type WebsiteCountOutputType = {
    metrics: number
  }

  export type WebsiteCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    metrics?: boolean | WebsiteCountOutputTypeCountMetricsArgs
  }

  // Custom InputTypes
  /**
   * WebsiteCountOutputType without action
   */
  export type WebsiteCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WebsiteCountOutputType
     */
    select?: WebsiteCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * WebsiteCountOutputType without action
   */
  export type WebsiteCountOutputTypeCountMetricsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: WebsiteMetricWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    email: string | null
    username: string | null
    password: string | null
    fullName: string | null
    phoneNumber: string | null
    hashedRt: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    email: string | null
    username: string | null
    password: string | null
    fullName: string | null
    phoneNumber: string | null
    hashedRt: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    email: number
    username: number
    password: number
    fullName: number
    phoneNumber: number
    hashedRt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    email?: true
    username?: true
    password?: true
    fullName?: true
    phoneNumber?: true
    hashedRt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    email?: true
    username?: true
    password?: true
    fullName?: true
    phoneNumber?: true
    hashedRt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    email?: true
    username?: true
    password?: true
    fullName?: true
    phoneNumber?: true
    hashedRt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    email: string | null
    username: string
    password: string
    fullName: string | null
    phoneNumber: string | null
    hashedRt: string | null
    createdAt: Date
    updatedAt: Date
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    username?: boolean
    password?: boolean
    fullName?: boolean
    phoneNumber?: boolean
    hashedRt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    websites?: boolean | User$websitesArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    username?: boolean
    password?: boolean
    fullName?: boolean
    phoneNumber?: boolean
    hashedRt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    username?: boolean
    password?: boolean
    fullName?: boolean
    phoneNumber?: boolean
    hashedRt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    email?: boolean
    username?: boolean
    password?: boolean
    fullName?: boolean
    phoneNumber?: boolean
    hashedRt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "email" | "username" | "password" | "fullName" | "phoneNumber" | "hashedRt" | "createdAt" | "updatedAt", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    websites?: boolean | User$websitesArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      websites: Prisma.$WebsitePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      email: string | null
      username: string
      password: string
      fullName: string | null
      phoneNumber: string | null
      hashedRt: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const userWithIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    websites<T extends User$websitesArgs<ExtArgs> = {}>(args?: Subset<T, User$websitesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WebsitePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly username: FieldRef<"User", 'String'>
    readonly password: FieldRef<"User", 'String'>
    readonly fullName: FieldRef<"User", 'String'>
    readonly phoneNumber: FieldRef<"User", 'String'>
    readonly hashedRt: FieldRef<"User", 'String'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User.websites
   */
  export type User$websitesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Website
     */
    select?: WebsiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Website
     */
    omit?: WebsiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WebsiteInclude<ExtArgs> | null
    where?: WebsiteWhereInput
    orderBy?: WebsiteOrderByWithRelationInput | WebsiteOrderByWithRelationInput[]
    cursor?: WebsiteWhereUniqueInput
    take?: number
    skip?: number
    distinct?: WebsiteScalarFieldEnum | WebsiteScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model Website
   */

  export type AggregateWebsite = {
    _count: WebsiteCountAggregateOutputType | null
    _avg: WebsiteAvgAggregateOutputType | null
    _sum: WebsiteSumAggregateOutputType | null
    _min: WebsiteMinAggregateOutputType | null
    _max: WebsiteMaxAggregateOutputType | null
  }

  export type WebsiteAvgAggregateOutputType = {
    port: number | null
  }

  export type WebsiteSumAggregateOutputType = {
    port: number | null
  }

  export type WebsiteMinAggregateOutputType = {
    id: string | null
    userId: string | null
    name: string | null
    domain: string | null
    port: number | null
    isActive: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type WebsiteMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    name: string | null
    domain: string | null
    port: number | null
    isActive: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type WebsiteCountAggregateOutputType = {
    id: number
    userId: number
    name: number
    domain: number
    port: number
    isActive: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type WebsiteAvgAggregateInputType = {
    port?: true
  }

  export type WebsiteSumAggregateInputType = {
    port?: true
  }

  export type WebsiteMinAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    domain?: true
    port?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
  }

  export type WebsiteMaxAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    domain?: true
    port?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
  }

  export type WebsiteCountAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    domain?: true
    port?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type WebsiteAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Website to aggregate.
     */
    where?: WebsiteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Websites to fetch.
     */
    orderBy?: WebsiteOrderByWithRelationInput | WebsiteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: WebsiteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Websites from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Websites.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Websites
    **/
    _count?: true | WebsiteCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: WebsiteAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: WebsiteSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: WebsiteMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: WebsiteMaxAggregateInputType
  }

  export type GetWebsiteAggregateType<T extends WebsiteAggregateArgs> = {
        [P in keyof T & keyof AggregateWebsite]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateWebsite[P]>
      : GetScalarType<T[P], AggregateWebsite[P]>
  }




  export type WebsiteGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: WebsiteWhereInput
    orderBy?: WebsiteOrderByWithAggregationInput | WebsiteOrderByWithAggregationInput[]
    by: WebsiteScalarFieldEnum[] | WebsiteScalarFieldEnum
    having?: WebsiteScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: WebsiteCountAggregateInputType | true
    _avg?: WebsiteAvgAggregateInputType
    _sum?: WebsiteSumAggregateInputType
    _min?: WebsiteMinAggregateInputType
    _max?: WebsiteMaxAggregateInputType
  }

  export type WebsiteGroupByOutputType = {
    id: string
    userId: string
    name: string
    domain: string
    port: number | null
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    _count: WebsiteCountAggregateOutputType | null
    _avg: WebsiteAvgAggregateOutputType | null
    _sum: WebsiteSumAggregateOutputType | null
    _min: WebsiteMinAggregateOutputType | null
    _max: WebsiteMaxAggregateOutputType | null
  }

  type GetWebsiteGroupByPayload<T extends WebsiteGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<WebsiteGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof WebsiteGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], WebsiteGroupByOutputType[P]>
            : GetScalarType<T[P], WebsiteGroupByOutputType[P]>
        }
      >
    >


  export type WebsiteSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    domain?: boolean
    port?: boolean
    isActive?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    metrics?: boolean | Website$metricsArgs<ExtArgs>
    ssl?: boolean | Website$sslArgs<ExtArgs>
    _count?: boolean | WebsiteCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["website"]>

  export type WebsiteSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    domain?: boolean
    port?: boolean
    isActive?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["website"]>

  export type WebsiteSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    domain?: boolean
    port?: boolean
    isActive?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["website"]>

  export type WebsiteSelectScalar = {
    id?: boolean
    userId?: boolean
    name?: boolean
    domain?: boolean
    port?: boolean
    isActive?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type WebsiteOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "name" | "domain" | "port" | "isActive" | "createdAt" | "updatedAt", ExtArgs["result"]["website"]>
  export type WebsiteInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    metrics?: boolean | Website$metricsArgs<ExtArgs>
    ssl?: boolean | Website$sslArgs<ExtArgs>
    _count?: boolean | WebsiteCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type WebsiteIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type WebsiteIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $WebsitePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Website"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      metrics: Prisma.$WebsiteMetricPayload<ExtArgs>[]
      ssl: Prisma.$SSLCertificatePayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      name: string
      domain: string
      port: number | null
      isActive: boolean
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["website"]>
    composites: {}
  }

  type WebsiteGetPayload<S extends boolean | null | undefined | WebsiteDefaultArgs> = $Result.GetResult<Prisma.$WebsitePayload, S>

  type WebsiteCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<WebsiteFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: WebsiteCountAggregateInputType | true
    }

  export interface WebsiteDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Website'], meta: { name: 'Website' } }
    /**
     * Find zero or one Website that matches the filter.
     * @param {WebsiteFindUniqueArgs} args - Arguments to find a Website
     * @example
     * // Get one Website
     * const website = await prisma.website.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends WebsiteFindUniqueArgs>(args: SelectSubset<T, WebsiteFindUniqueArgs<ExtArgs>>): Prisma__WebsiteClient<$Result.GetResult<Prisma.$WebsitePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Website that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {WebsiteFindUniqueOrThrowArgs} args - Arguments to find a Website
     * @example
     * // Get one Website
     * const website = await prisma.website.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends WebsiteFindUniqueOrThrowArgs>(args: SelectSubset<T, WebsiteFindUniqueOrThrowArgs<ExtArgs>>): Prisma__WebsiteClient<$Result.GetResult<Prisma.$WebsitePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Website that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WebsiteFindFirstArgs} args - Arguments to find a Website
     * @example
     * // Get one Website
     * const website = await prisma.website.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends WebsiteFindFirstArgs>(args?: SelectSubset<T, WebsiteFindFirstArgs<ExtArgs>>): Prisma__WebsiteClient<$Result.GetResult<Prisma.$WebsitePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Website that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WebsiteFindFirstOrThrowArgs} args - Arguments to find a Website
     * @example
     * // Get one Website
     * const website = await prisma.website.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends WebsiteFindFirstOrThrowArgs>(args?: SelectSubset<T, WebsiteFindFirstOrThrowArgs<ExtArgs>>): Prisma__WebsiteClient<$Result.GetResult<Prisma.$WebsitePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Websites that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WebsiteFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Websites
     * const websites = await prisma.website.findMany()
     * 
     * // Get first 10 Websites
     * const websites = await prisma.website.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const websiteWithIdOnly = await prisma.website.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends WebsiteFindManyArgs>(args?: SelectSubset<T, WebsiteFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WebsitePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Website.
     * @param {WebsiteCreateArgs} args - Arguments to create a Website.
     * @example
     * // Create one Website
     * const Website = await prisma.website.create({
     *   data: {
     *     // ... data to create a Website
     *   }
     * })
     * 
     */
    create<T extends WebsiteCreateArgs>(args: SelectSubset<T, WebsiteCreateArgs<ExtArgs>>): Prisma__WebsiteClient<$Result.GetResult<Prisma.$WebsitePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Websites.
     * @param {WebsiteCreateManyArgs} args - Arguments to create many Websites.
     * @example
     * // Create many Websites
     * const website = await prisma.website.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends WebsiteCreateManyArgs>(args?: SelectSubset<T, WebsiteCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Websites and returns the data saved in the database.
     * @param {WebsiteCreateManyAndReturnArgs} args - Arguments to create many Websites.
     * @example
     * // Create many Websites
     * const website = await prisma.website.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Websites and only return the `id`
     * const websiteWithIdOnly = await prisma.website.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends WebsiteCreateManyAndReturnArgs>(args?: SelectSubset<T, WebsiteCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WebsitePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Website.
     * @param {WebsiteDeleteArgs} args - Arguments to delete one Website.
     * @example
     * // Delete one Website
     * const Website = await prisma.website.delete({
     *   where: {
     *     // ... filter to delete one Website
     *   }
     * })
     * 
     */
    delete<T extends WebsiteDeleteArgs>(args: SelectSubset<T, WebsiteDeleteArgs<ExtArgs>>): Prisma__WebsiteClient<$Result.GetResult<Prisma.$WebsitePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Website.
     * @param {WebsiteUpdateArgs} args - Arguments to update one Website.
     * @example
     * // Update one Website
     * const website = await prisma.website.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends WebsiteUpdateArgs>(args: SelectSubset<T, WebsiteUpdateArgs<ExtArgs>>): Prisma__WebsiteClient<$Result.GetResult<Prisma.$WebsitePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Websites.
     * @param {WebsiteDeleteManyArgs} args - Arguments to filter Websites to delete.
     * @example
     * // Delete a few Websites
     * const { count } = await prisma.website.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends WebsiteDeleteManyArgs>(args?: SelectSubset<T, WebsiteDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Websites.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WebsiteUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Websites
     * const website = await prisma.website.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends WebsiteUpdateManyArgs>(args: SelectSubset<T, WebsiteUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Websites and returns the data updated in the database.
     * @param {WebsiteUpdateManyAndReturnArgs} args - Arguments to update many Websites.
     * @example
     * // Update many Websites
     * const website = await prisma.website.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Websites and only return the `id`
     * const websiteWithIdOnly = await prisma.website.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends WebsiteUpdateManyAndReturnArgs>(args: SelectSubset<T, WebsiteUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WebsitePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Website.
     * @param {WebsiteUpsertArgs} args - Arguments to update or create a Website.
     * @example
     * // Update or create a Website
     * const website = await prisma.website.upsert({
     *   create: {
     *     // ... data to create a Website
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Website we want to update
     *   }
     * })
     */
    upsert<T extends WebsiteUpsertArgs>(args: SelectSubset<T, WebsiteUpsertArgs<ExtArgs>>): Prisma__WebsiteClient<$Result.GetResult<Prisma.$WebsitePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Websites.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WebsiteCountArgs} args - Arguments to filter Websites to count.
     * @example
     * // Count the number of Websites
     * const count = await prisma.website.count({
     *   where: {
     *     // ... the filter for the Websites we want to count
     *   }
     * })
    **/
    count<T extends WebsiteCountArgs>(
      args?: Subset<T, WebsiteCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], WebsiteCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Website.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WebsiteAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends WebsiteAggregateArgs>(args: Subset<T, WebsiteAggregateArgs>): Prisma.PrismaPromise<GetWebsiteAggregateType<T>>

    /**
     * Group by Website.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WebsiteGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends WebsiteGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: WebsiteGroupByArgs['orderBy'] }
        : { orderBy?: WebsiteGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, WebsiteGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetWebsiteGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Website model
   */
  readonly fields: WebsiteFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Website.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__WebsiteClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    metrics<T extends Website$metricsArgs<ExtArgs> = {}>(args?: Subset<T, Website$metricsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WebsiteMetricPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    ssl<T extends Website$sslArgs<ExtArgs> = {}>(args?: Subset<T, Website$sslArgs<ExtArgs>>): Prisma__SSLCertificateClient<$Result.GetResult<Prisma.$SSLCertificatePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Website model
   */
  interface WebsiteFieldRefs {
    readonly id: FieldRef<"Website", 'String'>
    readonly userId: FieldRef<"Website", 'String'>
    readonly name: FieldRef<"Website", 'String'>
    readonly domain: FieldRef<"Website", 'String'>
    readonly port: FieldRef<"Website", 'Int'>
    readonly isActive: FieldRef<"Website", 'Boolean'>
    readonly createdAt: FieldRef<"Website", 'DateTime'>
    readonly updatedAt: FieldRef<"Website", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Website findUnique
   */
  export type WebsiteFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Website
     */
    select?: WebsiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Website
     */
    omit?: WebsiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WebsiteInclude<ExtArgs> | null
    /**
     * Filter, which Website to fetch.
     */
    where: WebsiteWhereUniqueInput
  }

  /**
   * Website findUniqueOrThrow
   */
  export type WebsiteFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Website
     */
    select?: WebsiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Website
     */
    omit?: WebsiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WebsiteInclude<ExtArgs> | null
    /**
     * Filter, which Website to fetch.
     */
    where: WebsiteWhereUniqueInput
  }

  /**
   * Website findFirst
   */
  export type WebsiteFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Website
     */
    select?: WebsiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Website
     */
    omit?: WebsiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WebsiteInclude<ExtArgs> | null
    /**
     * Filter, which Website to fetch.
     */
    where?: WebsiteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Websites to fetch.
     */
    orderBy?: WebsiteOrderByWithRelationInput | WebsiteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Websites.
     */
    cursor?: WebsiteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Websites from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Websites.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Websites.
     */
    distinct?: WebsiteScalarFieldEnum | WebsiteScalarFieldEnum[]
  }

  /**
   * Website findFirstOrThrow
   */
  export type WebsiteFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Website
     */
    select?: WebsiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Website
     */
    omit?: WebsiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WebsiteInclude<ExtArgs> | null
    /**
     * Filter, which Website to fetch.
     */
    where?: WebsiteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Websites to fetch.
     */
    orderBy?: WebsiteOrderByWithRelationInput | WebsiteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Websites.
     */
    cursor?: WebsiteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Websites from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Websites.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Websites.
     */
    distinct?: WebsiteScalarFieldEnum | WebsiteScalarFieldEnum[]
  }

  /**
   * Website findMany
   */
  export type WebsiteFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Website
     */
    select?: WebsiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Website
     */
    omit?: WebsiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WebsiteInclude<ExtArgs> | null
    /**
     * Filter, which Websites to fetch.
     */
    where?: WebsiteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Websites to fetch.
     */
    orderBy?: WebsiteOrderByWithRelationInput | WebsiteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Websites.
     */
    cursor?: WebsiteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Websites from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Websites.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Websites.
     */
    distinct?: WebsiteScalarFieldEnum | WebsiteScalarFieldEnum[]
  }

  /**
   * Website create
   */
  export type WebsiteCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Website
     */
    select?: WebsiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Website
     */
    omit?: WebsiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WebsiteInclude<ExtArgs> | null
    /**
     * The data needed to create a Website.
     */
    data: XOR<WebsiteCreateInput, WebsiteUncheckedCreateInput>
  }

  /**
   * Website createMany
   */
  export type WebsiteCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Websites.
     */
    data: WebsiteCreateManyInput | WebsiteCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Website createManyAndReturn
   */
  export type WebsiteCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Website
     */
    select?: WebsiteSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Website
     */
    omit?: WebsiteOmit<ExtArgs> | null
    /**
     * The data used to create many Websites.
     */
    data: WebsiteCreateManyInput | WebsiteCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WebsiteIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Website update
   */
  export type WebsiteUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Website
     */
    select?: WebsiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Website
     */
    omit?: WebsiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WebsiteInclude<ExtArgs> | null
    /**
     * The data needed to update a Website.
     */
    data: XOR<WebsiteUpdateInput, WebsiteUncheckedUpdateInput>
    /**
     * Choose, which Website to update.
     */
    where: WebsiteWhereUniqueInput
  }

  /**
   * Website updateMany
   */
  export type WebsiteUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Websites.
     */
    data: XOR<WebsiteUpdateManyMutationInput, WebsiteUncheckedUpdateManyInput>
    /**
     * Filter which Websites to update
     */
    where?: WebsiteWhereInput
    /**
     * Limit how many Websites to update.
     */
    limit?: number
  }

  /**
   * Website updateManyAndReturn
   */
  export type WebsiteUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Website
     */
    select?: WebsiteSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Website
     */
    omit?: WebsiteOmit<ExtArgs> | null
    /**
     * The data used to update Websites.
     */
    data: XOR<WebsiteUpdateManyMutationInput, WebsiteUncheckedUpdateManyInput>
    /**
     * Filter which Websites to update
     */
    where?: WebsiteWhereInput
    /**
     * Limit how many Websites to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WebsiteIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Website upsert
   */
  export type WebsiteUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Website
     */
    select?: WebsiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Website
     */
    omit?: WebsiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WebsiteInclude<ExtArgs> | null
    /**
     * The filter to search for the Website to update in case it exists.
     */
    where: WebsiteWhereUniqueInput
    /**
     * In case the Website found by the `where` argument doesn't exist, create a new Website with this data.
     */
    create: XOR<WebsiteCreateInput, WebsiteUncheckedCreateInput>
    /**
     * In case the Website was found with the provided `where` argument, update it with this data.
     */
    update: XOR<WebsiteUpdateInput, WebsiteUncheckedUpdateInput>
  }

  /**
   * Website delete
   */
  export type WebsiteDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Website
     */
    select?: WebsiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Website
     */
    omit?: WebsiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WebsiteInclude<ExtArgs> | null
    /**
     * Filter which Website to delete.
     */
    where: WebsiteWhereUniqueInput
  }

  /**
   * Website deleteMany
   */
  export type WebsiteDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Websites to delete
     */
    where?: WebsiteWhereInput
    /**
     * Limit how many Websites to delete.
     */
    limit?: number
  }

  /**
   * Website.metrics
   */
  export type Website$metricsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WebsiteMetric
     */
    select?: WebsiteMetricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WebsiteMetric
     */
    omit?: WebsiteMetricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WebsiteMetricInclude<ExtArgs> | null
    where?: WebsiteMetricWhereInput
    orderBy?: WebsiteMetricOrderByWithRelationInput | WebsiteMetricOrderByWithRelationInput[]
    cursor?: WebsiteMetricWhereUniqueInput
    take?: number
    skip?: number
    distinct?: WebsiteMetricScalarFieldEnum | WebsiteMetricScalarFieldEnum[]
  }

  /**
   * Website.ssl
   */
  export type Website$sslArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SSLCertificate
     */
    select?: SSLCertificateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SSLCertificate
     */
    omit?: SSLCertificateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SSLCertificateInclude<ExtArgs> | null
    where?: SSLCertificateWhereInput
  }

  /**
   * Website without action
   */
  export type WebsiteDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Website
     */
    select?: WebsiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Website
     */
    omit?: WebsiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WebsiteInclude<ExtArgs> | null
  }


  /**
   * Model WebsiteMetric
   */

  export type AggregateWebsiteMetric = {
    _count: WebsiteMetricCountAggregateOutputType | null
    _min: WebsiteMetricMinAggregateOutputType | null
    _max: WebsiteMetricMaxAggregateOutputType | null
  }

  export type WebsiteMetricMinAggregateOutputType = {
    id: string | null
    websiteId: string | null
  }

  export type WebsiteMetricMaxAggregateOutputType = {
    id: string | null
    websiteId: string | null
  }

  export type WebsiteMetricCountAggregateOutputType = {
    id: number
    websiteId: number
    _all: number
  }


  export type WebsiteMetricMinAggregateInputType = {
    id?: true
    websiteId?: true
  }

  export type WebsiteMetricMaxAggregateInputType = {
    id?: true
    websiteId?: true
  }

  export type WebsiteMetricCountAggregateInputType = {
    id?: true
    websiteId?: true
    _all?: true
  }

  export type WebsiteMetricAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which WebsiteMetric to aggregate.
     */
    where?: WebsiteMetricWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WebsiteMetrics to fetch.
     */
    orderBy?: WebsiteMetricOrderByWithRelationInput | WebsiteMetricOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: WebsiteMetricWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WebsiteMetrics from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WebsiteMetrics.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned WebsiteMetrics
    **/
    _count?: true | WebsiteMetricCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: WebsiteMetricMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: WebsiteMetricMaxAggregateInputType
  }

  export type GetWebsiteMetricAggregateType<T extends WebsiteMetricAggregateArgs> = {
        [P in keyof T & keyof AggregateWebsiteMetric]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateWebsiteMetric[P]>
      : GetScalarType<T[P], AggregateWebsiteMetric[P]>
  }




  export type WebsiteMetricGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: WebsiteMetricWhereInput
    orderBy?: WebsiteMetricOrderByWithAggregationInput | WebsiteMetricOrderByWithAggregationInput[]
    by: WebsiteMetricScalarFieldEnum[] | WebsiteMetricScalarFieldEnum
    having?: WebsiteMetricScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: WebsiteMetricCountAggregateInputType | true
    _min?: WebsiteMetricMinAggregateInputType
    _max?: WebsiteMetricMaxAggregateInputType
  }

  export type WebsiteMetricGroupByOutputType = {
    id: string
    websiteId: string
    _count: WebsiteMetricCountAggregateOutputType | null
    _min: WebsiteMetricMinAggregateOutputType | null
    _max: WebsiteMetricMaxAggregateOutputType | null
  }

  type GetWebsiteMetricGroupByPayload<T extends WebsiteMetricGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<WebsiteMetricGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof WebsiteMetricGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], WebsiteMetricGroupByOutputType[P]>
            : GetScalarType<T[P], WebsiteMetricGroupByOutputType[P]>
        }
      >
    >


  export type WebsiteMetricSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    websiteId?: boolean
    website?: boolean | WebsiteDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["websiteMetric"]>

  export type WebsiteMetricSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    websiteId?: boolean
    website?: boolean | WebsiteDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["websiteMetric"]>

  export type WebsiteMetricSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    websiteId?: boolean
    website?: boolean | WebsiteDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["websiteMetric"]>

  export type WebsiteMetricSelectScalar = {
    id?: boolean
    websiteId?: boolean
  }

  export type WebsiteMetricOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "websiteId", ExtArgs["result"]["websiteMetric"]>
  export type WebsiteMetricInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    website?: boolean | WebsiteDefaultArgs<ExtArgs>
  }
  export type WebsiteMetricIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    website?: boolean | WebsiteDefaultArgs<ExtArgs>
  }
  export type WebsiteMetricIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    website?: boolean | WebsiteDefaultArgs<ExtArgs>
  }

  export type $WebsiteMetricPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "WebsiteMetric"
    objects: {
      website: Prisma.$WebsitePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      websiteId: string
    }, ExtArgs["result"]["websiteMetric"]>
    composites: {}
  }

  type WebsiteMetricGetPayload<S extends boolean | null | undefined | WebsiteMetricDefaultArgs> = $Result.GetResult<Prisma.$WebsiteMetricPayload, S>

  type WebsiteMetricCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<WebsiteMetricFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: WebsiteMetricCountAggregateInputType | true
    }

  export interface WebsiteMetricDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['WebsiteMetric'], meta: { name: 'WebsiteMetric' } }
    /**
     * Find zero or one WebsiteMetric that matches the filter.
     * @param {WebsiteMetricFindUniqueArgs} args - Arguments to find a WebsiteMetric
     * @example
     * // Get one WebsiteMetric
     * const websiteMetric = await prisma.websiteMetric.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends WebsiteMetricFindUniqueArgs>(args: SelectSubset<T, WebsiteMetricFindUniqueArgs<ExtArgs>>): Prisma__WebsiteMetricClient<$Result.GetResult<Prisma.$WebsiteMetricPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one WebsiteMetric that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {WebsiteMetricFindUniqueOrThrowArgs} args - Arguments to find a WebsiteMetric
     * @example
     * // Get one WebsiteMetric
     * const websiteMetric = await prisma.websiteMetric.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends WebsiteMetricFindUniqueOrThrowArgs>(args: SelectSubset<T, WebsiteMetricFindUniqueOrThrowArgs<ExtArgs>>): Prisma__WebsiteMetricClient<$Result.GetResult<Prisma.$WebsiteMetricPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first WebsiteMetric that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WebsiteMetricFindFirstArgs} args - Arguments to find a WebsiteMetric
     * @example
     * // Get one WebsiteMetric
     * const websiteMetric = await prisma.websiteMetric.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends WebsiteMetricFindFirstArgs>(args?: SelectSubset<T, WebsiteMetricFindFirstArgs<ExtArgs>>): Prisma__WebsiteMetricClient<$Result.GetResult<Prisma.$WebsiteMetricPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first WebsiteMetric that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WebsiteMetricFindFirstOrThrowArgs} args - Arguments to find a WebsiteMetric
     * @example
     * // Get one WebsiteMetric
     * const websiteMetric = await prisma.websiteMetric.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends WebsiteMetricFindFirstOrThrowArgs>(args?: SelectSubset<T, WebsiteMetricFindFirstOrThrowArgs<ExtArgs>>): Prisma__WebsiteMetricClient<$Result.GetResult<Prisma.$WebsiteMetricPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more WebsiteMetrics that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WebsiteMetricFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all WebsiteMetrics
     * const websiteMetrics = await prisma.websiteMetric.findMany()
     * 
     * // Get first 10 WebsiteMetrics
     * const websiteMetrics = await prisma.websiteMetric.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const websiteMetricWithIdOnly = await prisma.websiteMetric.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends WebsiteMetricFindManyArgs>(args?: SelectSubset<T, WebsiteMetricFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WebsiteMetricPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a WebsiteMetric.
     * @param {WebsiteMetricCreateArgs} args - Arguments to create a WebsiteMetric.
     * @example
     * // Create one WebsiteMetric
     * const WebsiteMetric = await prisma.websiteMetric.create({
     *   data: {
     *     // ... data to create a WebsiteMetric
     *   }
     * })
     * 
     */
    create<T extends WebsiteMetricCreateArgs>(args: SelectSubset<T, WebsiteMetricCreateArgs<ExtArgs>>): Prisma__WebsiteMetricClient<$Result.GetResult<Prisma.$WebsiteMetricPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many WebsiteMetrics.
     * @param {WebsiteMetricCreateManyArgs} args - Arguments to create many WebsiteMetrics.
     * @example
     * // Create many WebsiteMetrics
     * const websiteMetric = await prisma.websiteMetric.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends WebsiteMetricCreateManyArgs>(args?: SelectSubset<T, WebsiteMetricCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many WebsiteMetrics and returns the data saved in the database.
     * @param {WebsiteMetricCreateManyAndReturnArgs} args - Arguments to create many WebsiteMetrics.
     * @example
     * // Create many WebsiteMetrics
     * const websiteMetric = await prisma.websiteMetric.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many WebsiteMetrics and only return the `id`
     * const websiteMetricWithIdOnly = await prisma.websiteMetric.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends WebsiteMetricCreateManyAndReturnArgs>(args?: SelectSubset<T, WebsiteMetricCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WebsiteMetricPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a WebsiteMetric.
     * @param {WebsiteMetricDeleteArgs} args - Arguments to delete one WebsiteMetric.
     * @example
     * // Delete one WebsiteMetric
     * const WebsiteMetric = await prisma.websiteMetric.delete({
     *   where: {
     *     // ... filter to delete one WebsiteMetric
     *   }
     * })
     * 
     */
    delete<T extends WebsiteMetricDeleteArgs>(args: SelectSubset<T, WebsiteMetricDeleteArgs<ExtArgs>>): Prisma__WebsiteMetricClient<$Result.GetResult<Prisma.$WebsiteMetricPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one WebsiteMetric.
     * @param {WebsiteMetricUpdateArgs} args - Arguments to update one WebsiteMetric.
     * @example
     * // Update one WebsiteMetric
     * const websiteMetric = await prisma.websiteMetric.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends WebsiteMetricUpdateArgs>(args: SelectSubset<T, WebsiteMetricUpdateArgs<ExtArgs>>): Prisma__WebsiteMetricClient<$Result.GetResult<Prisma.$WebsiteMetricPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more WebsiteMetrics.
     * @param {WebsiteMetricDeleteManyArgs} args - Arguments to filter WebsiteMetrics to delete.
     * @example
     * // Delete a few WebsiteMetrics
     * const { count } = await prisma.websiteMetric.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends WebsiteMetricDeleteManyArgs>(args?: SelectSubset<T, WebsiteMetricDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more WebsiteMetrics.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WebsiteMetricUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many WebsiteMetrics
     * const websiteMetric = await prisma.websiteMetric.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends WebsiteMetricUpdateManyArgs>(args: SelectSubset<T, WebsiteMetricUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more WebsiteMetrics and returns the data updated in the database.
     * @param {WebsiteMetricUpdateManyAndReturnArgs} args - Arguments to update many WebsiteMetrics.
     * @example
     * // Update many WebsiteMetrics
     * const websiteMetric = await prisma.websiteMetric.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more WebsiteMetrics and only return the `id`
     * const websiteMetricWithIdOnly = await prisma.websiteMetric.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends WebsiteMetricUpdateManyAndReturnArgs>(args: SelectSubset<T, WebsiteMetricUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WebsiteMetricPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one WebsiteMetric.
     * @param {WebsiteMetricUpsertArgs} args - Arguments to update or create a WebsiteMetric.
     * @example
     * // Update or create a WebsiteMetric
     * const websiteMetric = await prisma.websiteMetric.upsert({
     *   create: {
     *     // ... data to create a WebsiteMetric
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the WebsiteMetric we want to update
     *   }
     * })
     */
    upsert<T extends WebsiteMetricUpsertArgs>(args: SelectSubset<T, WebsiteMetricUpsertArgs<ExtArgs>>): Prisma__WebsiteMetricClient<$Result.GetResult<Prisma.$WebsiteMetricPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of WebsiteMetrics.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WebsiteMetricCountArgs} args - Arguments to filter WebsiteMetrics to count.
     * @example
     * // Count the number of WebsiteMetrics
     * const count = await prisma.websiteMetric.count({
     *   where: {
     *     // ... the filter for the WebsiteMetrics we want to count
     *   }
     * })
    **/
    count<T extends WebsiteMetricCountArgs>(
      args?: Subset<T, WebsiteMetricCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], WebsiteMetricCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a WebsiteMetric.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WebsiteMetricAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends WebsiteMetricAggregateArgs>(args: Subset<T, WebsiteMetricAggregateArgs>): Prisma.PrismaPromise<GetWebsiteMetricAggregateType<T>>

    /**
     * Group by WebsiteMetric.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WebsiteMetricGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends WebsiteMetricGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: WebsiteMetricGroupByArgs['orderBy'] }
        : { orderBy?: WebsiteMetricGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, WebsiteMetricGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetWebsiteMetricGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the WebsiteMetric model
   */
  readonly fields: WebsiteMetricFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for WebsiteMetric.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__WebsiteMetricClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    website<T extends WebsiteDefaultArgs<ExtArgs> = {}>(args?: Subset<T, WebsiteDefaultArgs<ExtArgs>>): Prisma__WebsiteClient<$Result.GetResult<Prisma.$WebsitePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the WebsiteMetric model
   */
  interface WebsiteMetricFieldRefs {
    readonly id: FieldRef<"WebsiteMetric", 'String'>
    readonly websiteId: FieldRef<"WebsiteMetric", 'String'>
  }
    

  // Custom InputTypes
  /**
   * WebsiteMetric findUnique
   */
  export type WebsiteMetricFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WebsiteMetric
     */
    select?: WebsiteMetricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WebsiteMetric
     */
    omit?: WebsiteMetricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WebsiteMetricInclude<ExtArgs> | null
    /**
     * Filter, which WebsiteMetric to fetch.
     */
    where: WebsiteMetricWhereUniqueInput
  }

  /**
   * WebsiteMetric findUniqueOrThrow
   */
  export type WebsiteMetricFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WebsiteMetric
     */
    select?: WebsiteMetricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WebsiteMetric
     */
    omit?: WebsiteMetricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WebsiteMetricInclude<ExtArgs> | null
    /**
     * Filter, which WebsiteMetric to fetch.
     */
    where: WebsiteMetricWhereUniqueInput
  }

  /**
   * WebsiteMetric findFirst
   */
  export type WebsiteMetricFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WebsiteMetric
     */
    select?: WebsiteMetricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WebsiteMetric
     */
    omit?: WebsiteMetricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WebsiteMetricInclude<ExtArgs> | null
    /**
     * Filter, which WebsiteMetric to fetch.
     */
    where?: WebsiteMetricWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WebsiteMetrics to fetch.
     */
    orderBy?: WebsiteMetricOrderByWithRelationInput | WebsiteMetricOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for WebsiteMetrics.
     */
    cursor?: WebsiteMetricWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WebsiteMetrics from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WebsiteMetrics.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of WebsiteMetrics.
     */
    distinct?: WebsiteMetricScalarFieldEnum | WebsiteMetricScalarFieldEnum[]
  }

  /**
   * WebsiteMetric findFirstOrThrow
   */
  export type WebsiteMetricFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WebsiteMetric
     */
    select?: WebsiteMetricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WebsiteMetric
     */
    omit?: WebsiteMetricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WebsiteMetricInclude<ExtArgs> | null
    /**
     * Filter, which WebsiteMetric to fetch.
     */
    where?: WebsiteMetricWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WebsiteMetrics to fetch.
     */
    orderBy?: WebsiteMetricOrderByWithRelationInput | WebsiteMetricOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for WebsiteMetrics.
     */
    cursor?: WebsiteMetricWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WebsiteMetrics from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WebsiteMetrics.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of WebsiteMetrics.
     */
    distinct?: WebsiteMetricScalarFieldEnum | WebsiteMetricScalarFieldEnum[]
  }

  /**
   * WebsiteMetric findMany
   */
  export type WebsiteMetricFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WebsiteMetric
     */
    select?: WebsiteMetricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WebsiteMetric
     */
    omit?: WebsiteMetricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WebsiteMetricInclude<ExtArgs> | null
    /**
     * Filter, which WebsiteMetrics to fetch.
     */
    where?: WebsiteMetricWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WebsiteMetrics to fetch.
     */
    orderBy?: WebsiteMetricOrderByWithRelationInput | WebsiteMetricOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing WebsiteMetrics.
     */
    cursor?: WebsiteMetricWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WebsiteMetrics from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WebsiteMetrics.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of WebsiteMetrics.
     */
    distinct?: WebsiteMetricScalarFieldEnum | WebsiteMetricScalarFieldEnum[]
  }

  /**
   * WebsiteMetric create
   */
  export type WebsiteMetricCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WebsiteMetric
     */
    select?: WebsiteMetricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WebsiteMetric
     */
    omit?: WebsiteMetricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WebsiteMetricInclude<ExtArgs> | null
    /**
     * The data needed to create a WebsiteMetric.
     */
    data: XOR<WebsiteMetricCreateInput, WebsiteMetricUncheckedCreateInput>
  }

  /**
   * WebsiteMetric createMany
   */
  export type WebsiteMetricCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many WebsiteMetrics.
     */
    data: WebsiteMetricCreateManyInput | WebsiteMetricCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * WebsiteMetric createManyAndReturn
   */
  export type WebsiteMetricCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WebsiteMetric
     */
    select?: WebsiteMetricSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the WebsiteMetric
     */
    omit?: WebsiteMetricOmit<ExtArgs> | null
    /**
     * The data used to create many WebsiteMetrics.
     */
    data: WebsiteMetricCreateManyInput | WebsiteMetricCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WebsiteMetricIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * WebsiteMetric update
   */
  export type WebsiteMetricUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WebsiteMetric
     */
    select?: WebsiteMetricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WebsiteMetric
     */
    omit?: WebsiteMetricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WebsiteMetricInclude<ExtArgs> | null
    /**
     * The data needed to update a WebsiteMetric.
     */
    data: XOR<WebsiteMetricUpdateInput, WebsiteMetricUncheckedUpdateInput>
    /**
     * Choose, which WebsiteMetric to update.
     */
    where: WebsiteMetricWhereUniqueInput
  }

  /**
   * WebsiteMetric updateMany
   */
  export type WebsiteMetricUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update WebsiteMetrics.
     */
    data: XOR<WebsiteMetricUpdateManyMutationInput, WebsiteMetricUncheckedUpdateManyInput>
    /**
     * Filter which WebsiteMetrics to update
     */
    where?: WebsiteMetricWhereInput
    /**
     * Limit how many WebsiteMetrics to update.
     */
    limit?: number
  }

  /**
   * WebsiteMetric updateManyAndReturn
   */
  export type WebsiteMetricUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WebsiteMetric
     */
    select?: WebsiteMetricSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the WebsiteMetric
     */
    omit?: WebsiteMetricOmit<ExtArgs> | null
    /**
     * The data used to update WebsiteMetrics.
     */
    data: XOR<WebsiteMetricUpdateManyMutationInput, WebsiteMetricUncheckedUpdateManyInput>
    /**
     * Filter which WebsiteMetrics to update
     */
    where?: WebsiteMetricWhereInput
    /**
     * Limit how many WebsiteMetrics to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WebsiteMetricIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * WebsiteMetric upsert
   */
  export type WebsiteMetricUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WebsiteMetric
     */
    select?: WebsiteMetricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WebsiteMetric
     */
    omit?: WebsiteMetricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WebsiteMetricInclude<ExtArgs> | null
    /**
     * The filter to search for the WebsiteMetric to update in case it exists.
     */
    where: WebsiteMetricWhereUniqueInput
    /**
     * In case the WebsiteMetric found by the `where` argument doesn't exist, create a new WebsiteMetric with this data.
     */
    create: XOR<WebsiteMetricCreateInput, WebsiteMetricUncheckedCreateInput>
    /**
     * In case the WebsiteMetric was found with the provided `where` argument, update it with this data.
     */
    update: XOR<WebsiteMetricUpdateInput, WebsiteMetricUncheckedUpdateInput>
  }

  /**
   * WebsiteMetric delete
   */
  export type WebsiteMetricDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WebsiteMetric
     */
    select?: WebsiteMetricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WebsiteMetric
     */
    omit?: WebsiteMetricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WebsiteMetricInclude<ExtArgs> | null
    /**
     * Filter which WebsiteMetric to delete.
     */
    where: WebsiteMetricWhereUniqueInput
  }

  /**
   * WebsiteMetric deleteMany
   */
  export type WebsiteMetricDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which WebsiteMetrics to delete
     */
    where?: WebsiteMetricWhereInput
    /**
     * Limit how many WebsiteMetrics to delete.
     */
    limit?: number
  }

  /**
   * WebsiteMetric without action
   */
  export type WebsiteMetricDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WebsiteMetric
     */
    select?: WebsiteMetricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the WebsiteMetric
     */
    omit?: WebsiteMetricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WebsiteMetricInclude<ExtArgs> | null
  }


  /**
   * Model SSLCertificate
   */

  export type AggregateSSLCertificate = {
    _count: SSLCertificateCountAggregateOutputType | null
    _min: SSLCertificateMinAggregateOutputType | null
    _max: SSLCertificateMaxAggregateOutputType | null
  }

  export type SSLCertificateMinAggregateOutputType = {
    id: string | null
    websiteId: string | null
    issuer: string | null
    subject: string | null
    validFrom: Date | null
    validTo: Date | null
    isValid: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SSLCertificateMaxAggregateOutputType = {
    id: string | null
    websiteId: string | null
    issuer: string | null
    subject: string | null
    validFrom: Date | null
    validTo: Date | null
    isValid: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SSLCertificateCountAggregateOutputType = {
    id: number
    websiteId: number
    issuer: number
    subject: number
    validFrom: number
    validTo: number
    isValid: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type SSLCertificateMinAggregateInputType = {
    id?: true
    websiteId?: true
    issuer?: true
    subject?: true
    validFrom?: true
    validTo?: true
    isValid?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SSLCertificateMaxAggregateInputType = {
    id?: true
    websiteId?: true
    issuer?: true
    subject?: true
    validFrom?: true
    validTo?: true
    isValid?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SSLCertificateCountAggregateInputType = {
    id?: true
    websiteId?: true
    issuer?: true
    subject?: true
    validFrom?: true
    validTo?: true
    isValid?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type SSLCertificateAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SSLCertificate to aggregate.
     */
    where?: SSLCertificateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SSLCertificates to fetch.
     */
    orderBy?: SSLCertificateOrderByWithRelationInput | SSLCertificateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SSLCertificateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SSLCertificates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SSLCertificates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned SSLCertificates
    **/
    _count?: true | SSLCertificateCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SSLCertificateMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SSLCertificateMaxAggregateInputType
  }

  export type GetSSLCertificateAggregateType<T extends SSLCertificateAggregateArgs> = {
        [P in keyof T & keyof AggregateSSLCertificate]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSSLCertificate[P]>
      : GetScalarType<T[P], AggregateSSLCertificate[P]>
  }




  export type SSLCertificateGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SSLCertificateWhereInput
    orderBy?: SSLCertificateOrderByWithAggregationInput | SSLCertificateOrderByWithAggregationInput[]
    by: SSLCertificateScalarFieldEnum[] | SSLCertificateScalarFieldEnum
    having?: SSLCertificateScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SSLCertificateCountAggregateInputType | true
    _min?: SSLCertificateMinAggregateInputType
    _max?: SSLCertificateMaxAggregateInputType
  }

  export type SSLCertificateGroupByOutputType = {
    id: string
    websiteId: string
    issuer: string | null
    subject: string | null
    validFrom: Date | null
    validTo: Date | null
    isValid: boolean
    createdAt: Date
    updatedAt: Date
    _count: SSLCertificateCountAggregateOutputType | null
    _min: SSLCertificateMinAggregateOutputType | null
    _max: SSLCertificateMaxAggregateOutputType | null
  }

  type GetSSLCertificateGroupByPayload<T extends SSLCertificateGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SSLCertificateGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SSLCertificateGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SSLCertificateGroupByOutputType[P]>
            : GetScalarType<T[P], SSLCertificateGroupByOutputType[P]>
        }
      >
    >


  export type SSLCertificateSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    websiteId?: boolean
    issuer?: boolean
    subject?: boolean
    validFrom?: boolean
    validTo?: boolean
    isValid?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    website?: boolean | WebsiteDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["sSLCertificate"]>

  export type SSLCertificateSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    websiteId?: boolean
    issuer?: boolean
    subject?: boolean
    validFrom?: boolean
    validTo?: boolean
    isValid?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    website?: boolean | WebsiteDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["sSLCertificate"]>

  export type SSLCertificateSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    websiteId?: boolean
    issuer?: boolean
    subject?: boolean
    validFrom?: boolean
    validTo?: boolean
    isValid?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    website?: boolean | WebsiteDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["sSLCertificate"]>

  export type SSLCertificateSelectScalar = {
    id?: boolean
    websiteId?: boolean
    issuer?: boolean
    subject?: boolean
    validFrom?: boolean
    validTo?: boolean
    isValid?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type SSLCertificateOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "websiteId" | "issuer" | "subject" | "validFrom" | "validTo" | "isValid" | "createdAt" | "updatedAt", ExtArgs["result"]["sSLCertificate"]>
  export type SSLCertificateInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    website?: boolean | WebsiteDefaultArgs<ExtArgs>
  }
  export type SSLCertificateIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    website?: boolean | WebsiteDefaultArgs<ExtArgs>
  }
  export type SSLCertificateIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    website?: boolean | WebsiteDefaultArgs<ExtArgs>
  }

  export type $SSLCertificatePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "SSLCertificate"
    objects: {
      website: Prisma.$WebsitePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      websiteId: string
      issuer: string | null
      subject: string | null
      validFrom: Date | null
      validTo: Date | null
      isValid: boolean
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["sSLCertificate"]>
    composites: {}
  }

  type SSLCertificateGetPayload<S extends boolean | null | undefined | SSLCertificateDefaultArgs> = $Result.GetResult<Prisma.$SSLCertificatePayload, S>

  type SSLCertificateCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SSLCertificateFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SSLCertificateCountAggregateInputType | true
    }

  export interface SSLCertificateDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['SSLCertificate'], meta: { name: 'SSLCertificate' } }
    /**
     * Find zero or one SSLCertificate that matches the filter.
     * @param {SSLCertificateFindUniqueArgs} args - Arguments to find a SSLCertificate
     * @example
     * // Get one SSLCertificate
     * const sSLCertificate = await prisma.sSLCertificate.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SSLCertificateFindUniqueArgs>(args: SelectSubset<T, SSLCertificateFindUniqueArgs<ExtArgs>>): Prisma__SSLCertificateClient<$Result.GetResult<Prisma.$SSLCertificatePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one SSLCertificate that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SSLCertificateFindUniqueOrThrowArgs} args - Arguments to find a SSLCertificate
     * @example
     * // Get one SSLCertificate
     * const sSLCertificate = await prisma.sSLCertificate.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SSLCertificateFindUniqueOrThrowArgs>(args: SelectSubset<T, SSLCertificateFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SSLCertificateClient<$Result.GetResult<Prisma.$SSLCertificatePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SSLCertificate that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SSLCertificateFindFirstArgs} args - Arguments to find a SSLCertificate
     * @example
     * // Get one SSLCertificate
     * const sSLCertificate = await prisma.sSLCertificate.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SSLCertificateFindFirstArgs>(args?: SelectSubset<T, SSLCertificateFindFirstArgs<ExtArgs>>): Prisma__SSLCertificateClient<$Result.GetResult<Prisma.$SSLCertificatePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SSLCertificate that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SSLCertificateFindFirstOrThrowArgs} args - Arguments to find a SSLCertificate
     * @example
     * // Get one SSLCertificate
     * const sSLCertificate = await prisma.sSLCertificate.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SSLCertificateFindFirstOrThrowArgs>(args?: SelectSubset<T, SSLCertificateFindFirstOrThrowArgs<ExtArgs>>): Prisma__SSLCertificateClient<$Result.GetResult<Prisma.$SSLCertificatePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more SSLCertificates that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SSLCertificateFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all SSLCertificates
     * const sSLCertificates = await prisma.sSLCertificate.findMany()
     * 
     * // Get first 10 SSLCertificates
     * const sSLCertificates = await prisma.sSLCertificate.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const sSLCertificateWithIdOnly = await prisma.sSLCertificate.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SSLCertificateFindManyArgs>(args?: SelectSubset<T, SSLCertificateFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SSLCertificatePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a SSLCertificate.
     * @param {SSLCertificateCreateArgs} args - Arguments to create a SSLCertificate.
     * @example
     * // Create one SSLCertificate
     * const SSLCertificate = await prisma.sSLCertificate.create({
     *   data: {
     *     // ... data to create a SSLCertificate
     *   }
     * })
     * 
     */
    create<T extends SSLCertificateCreateArgs>(args: SelectSubset<T, SSLCertificateCreateArgs<ExtArgs>>): Prisma__SSLCertificateClient<$Result.GetResult<Prisma.$SSLCertificatePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many SSLCertificates.
     * @param {SSLCertificateCreateManyArgs} args - Arguments to create many SSLCertificates.
     * @example
     * // Create many SSLCertificates
     * const sSLCertificate = await prisma.sSLCertificate.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SSLCertificateCreateManyArgs>(args?: SelectSubset<T, SSLCertificateCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many SSLCertificates and returns the data saved in the database.
     * @param {SSLCertificateCreateManyAndReturnArgs} args - Arguments to create many SSLCertificates.
     * @example
     * // Create many SSLCertificates
     * const sSLCertificate = await prisma.sSLCertificate.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many SSLCertificates and only return the `id`
     * const sSLCertificateWithIdOnly = await prisma.sSLCertificate.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SSLCertificateCreateManyAndReturnArgs>(args?: SelectSubset<T, SSLCertificateCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SSLCertificatePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a SSLCertificate.
     * @param {SSLCertificateDeleteArgs} args - Arguments to delete one SSLCertificate.
     * @example
     * // Delete one SSLCertificate
     * const SSLCertificate = await prisma.sSLCertificate.delete({
     *   where: {
     *     // ... filter to delete one SSLCertificate
     *   }
     * })
     * 
     */
    delete<T extends SSLCertificateDeleteArgs>(args: SelectSubset<T, SSLCertificateDeleteArgs<ExtArgs>>): Prisma__SSLCertificateClient<$Result.GetResult<Prisma.$SSLCertificatePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one SSLCertificate.
     * @param {SSLCertificateUpdateArgs} args - Arguments to update one SSLCertificate.
     * @example
     * // Update one SSLCertificate
     * const sSLCertificate = await prisma.sSLCertificate.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SSLCertificateUpdateArgs>(args: SelectSubset<T, SSLCertificateUpdateArgs<ExtArgs>>): Prisma__SSLCertificateClient<$Result.GetResult<Prisma.$SSLCertificatePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more SSLCertificates.
     * @param {SSLCertificateDeleteManyArgs} args - Arguments to filter SSLCertificates to delete.
     * @example
     * // Delete a few SSLCertificates
     * const { count } = await prisma.sSLCertificate.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SSLCertificateDeleteManyArgs>(args?: SelectSubset<T, SSLCertificateDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SSLCertificates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SSLCertificateUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many SSLCertificates
     * const sSLCertificate = await prisma.sSLCertificate.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SSLCertificateUpdateManyArgs>(args: SelectSubset<T, SSLCertificateUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SSLCertificates and returns the data updated in the database.
     * @param {SSLCertificateUpdateManyAndReturnArgs} args - Arguments to update many SSLCertificates.
     * @example
     * // Update many SSLCertificates
     * const sSLCertificate = await prisma.sSLCertificate.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more SSLCertificates and only return the `id`
     * const sSLCertificateWithIdOnly = await prisma.sSLCertificate.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SSLCertificateUpdateManyAndReturnArgs>(args: SelectSubset<T, SSLCertificateUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SSLCertificatePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one SSLCertificate.
     * @param {SSLCertificateUpsertArgs} args - Arguments to update or create a SSLCertificate.
     * @example
     * // Update or create a SSLCertificate
     * const sSLCertificate = await prisma.sSLCertificate.upsert({
     *   create: {
     *     // ... data to create a SSLCertificate
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the SSLCertificate we want to update
     *   }
     * })
     */
    upsert<T extends SSLCertificateUpsertArgs>(args: SelectSubset<T, SSLCertificateUpsertArgs<ExtArgs>>): Prisma__SSLCertificateClient<$Result.GetResult<Prisma.$SSLCertificatePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of SSLCertificates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SSLCertificateCountArgs} args - Arguments to filter SSLCertificates to count.
     * @example
     * // Count the number of SSLCertificates
     * const count = await prisma.sSLCertificate.count({
     *   where: {
     *     // ... the filter for the SSLCertificates we want to count
     *   }
     * })
    **/
    count<T extends SSLCertificateCountArgs>(
      args?: Subset<T, SSLCertificateCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SSLCertificateCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a SSLCertificate.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SSLCertificateAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SSLCertificateAggregateArgs>(args: Subset<T, SSLCertificateAggregateArgs>): Prisma.PrismaPromise<GetSSLCertificateAggregateType<T>>

    /**
     * Group by SSLCertificate.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SSLCertificateGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SSLCertificateGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SSLCertificateGroupByArgs['orderBy'] }
        : { orderBy?: SSLCertificateGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SSLCertificateGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSSLCertificateGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the SSLCertificate model
   */
  readonly fields: SSLCertificateFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for SSLCertificate.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SSLCertificateClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    website<T extends WebsiteDefaultArgs<ExtArgs> = {}>(args?: Subset<T, WebsiteDefaultArgs<ExtArgs>>): Prisma__WebsiteClient<$Result.GetResult<Prisma.$WebsitePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the SSLCertificate model
   */
  interface SSLCertificateFieldRefs {
    readonly id: FieldRef<"SSLCertificate", 'String'>
    readonly websiteId: FieldRef<"SSLCertificate", 'String'>
    readonly issuer: FieldRef<"SSLCertificate", 'String'>
    readonly subject: FieldRef<"SSLCertificate", 'String'>
    readonly validFrom: FieldRef<"SSLCertificate", 'DateTime'>
    readonly validTo: FieldRef<"SSLCertificate", 'DateTime'>
    readonly isValid: FieldRef<"SSLCertificate", 'Boolean'>
    readonly createdAt: FieldRef<"SSLCertificate", 'DateTime'>
    readonly updatedAt: FieldRef<"SSLCertificate", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * SSLCertificate findUnique
   */
  export type SSLCertificateFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SSLCertificate
     */
    select?: SSLCertificateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SSLCertificate
     */
    omit?: SSLCertificateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SSLCertificateInclude<ExtArgs> | null
    /**
     * Filter, which SSLCertificate to fetch.
     */
    where: SSLCertificateWhereUniqueInput
  }

  /**
   * SSLCertificate findUniqueOrThrow
   */
  export type SSLCertificateFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SSLCertificate
     */
    select?: SSLCertificateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SSLCertificate
     */
    omit?: SSLCertificateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SSLCertificateInclude<ExtArgs> | null
    /**
     * Filter, which SSLCertificate to fetch.
     */
    where: SSLCertificateWhereUniqueInput
  }

  /**
   * SSLCertificate findFirst
   */
  export type SSLCertificateFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SSLCertificate
     */
    select?: SSLCertificateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SSLCertificate
     */
    omit?: SSLCertificateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SSLCertificateInclude<ExtArgs> | null
    /**
     * Filter, which SSLCertificate to fetch.
     */
    where?: SSLCertificateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SSLCertificates to fetch.
     */
    orderBy?: SSLCertificateOrderByWithRelationInput | SSLCertificateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SSLCertificates.
     */
    cursor?: SSLCertificateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SSLCertificates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SSLCertificates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SSLCertificates.
     */
    distinct?: SSLCertificateScalarFieldEnum | SSLCertificateScalarFieldEnum[]
  }

  /**
   * SSLCertificate findFirstOrThrow
   */
  export type SSLCertificateFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SSLCertificate
     */
    select?: SSLCertificateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SSLCertificate
     */
    omit?: SSLCertificateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SSLCertificateInclude<ExtArgs> | null
    /**
     * Filter, which SSLCertificate to fetch.
     */
    where?: SSLCertificateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SSLCertificates to fetch.
     */
    orderBy?: SSLCertificateOrderByWithRelationInput | SSLCertificateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SSLCertificates.
     */
    cursor?: SSLCertificateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SSLCertificates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SSLCertificates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SSLCertificates.
     */
    distinct?: SSLCertificateScalarFieldEnum | SSLCertificateScalarFieldEnum[]
  }

  /**
   * SSLCertificate findMany
   */
  export type SSLCertificateFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SSLCertificate
     */
    select?: SSLCertificateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SSLCertificate
     */
    omit?: SSLCertificateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SSLCertificateInclude<ExtArgs> | null
    /**
     * Filter, which SSLCertificates to fetch.
     */
    where?: SSLCertificateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SSLCertificates to fetch.
     */
    orderBy?: SSLCertificateOrderByWithRelationInput | SSLCertificateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing SSLCertificates.
     */
    cursor?: SSLCertificateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SSLCertificates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SSLCertificates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SSLCertificates.
     */
    distinct?: SSLCertificateScalarFieldEnum | SSLCertificateScalarFieldEnum[]
  }

  /**
   * SSLCertificate create
   */
  export type SSLCertificateCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SSLCertificate
     */
    select?: SSLCertificateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SSLCertificate
     */
    omit?: SSLCertificateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SSLCertificateInclude<ExtArgs> | null
    /**
     * The data needed to create a SSLCertificate.
     */
    data: XOR<SSLCertificateCreateInput, SSLCertificateUncheckedCreateInput>
  }

  /**
   * SSLCertificate createMany
   */
  export type SSLCertificateCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many SSLCertificates.
     */
    data: SSLCertificateCreateManyInput | SSLCertificateCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * SSLCertificate createManyAndReturn
   */
  export type SSLCertificateCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SSLCertificate
     */
    select?: SSLCertificateSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the SSLCertificate
     */
    omit?: SSLCertificateOmit<ExtArgs> | null
    /**
     * The data used to create many SSLCertificates.
     */
    data: SSLCertificateCreateManyInput | SSLCertificateCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SSLCertificateIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * SSLCertificate update
   */
  export type SSLCertificateUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SSLCertificate
     */
    select?: SSLCertificateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SSLCertificate
     */
    omit?: SSLCertificateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SSLCertificateInclude<ExtArgs> | null
    /**
     * The data needed to update a SSLCertificate.
     */
    data: XOR<SSLCertificateUpdateInput, SSLCertificateUncheckedUpdateInput>
    /**
     * Choose, which SSLCertificate to update.
     */
    where: SSLCertificateWhereUniqueInput
  }

  /**
   * SSLCertificate updateMany
   */
  export type SSLCertificateUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update SSLCertificates.
     */
    data: XOR<SSLCertificateUpdateManyMutationInput, SSLCertificateUncheckedUpdateManyInput>
    /**
     * Filter which SSLCertificates to update
     */
    where?: SSLCertificateWhereInput
    /**
     * Limit how many SSLCertificates to update.
     */
    limit?: number
  }

  /**
   * SSLCertificate updateManyAndReturn
   */
  export type SSLCertificateUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SSLCertificate
     */
    select?: SSLCertificateSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the SSLCertificate
     */
    omit?: SSLCertificateOmit<ExtArgs> | null
    /**
     * The data used to update SSLCertificates.
     */
    data: XOR<SSLCertificateUpdateManyMutationInput, SSLCertificateUncheckedUpdateManyInput>
    /**
     * Filter which SSLCertificates to update
     */
    where?: SSLCertificateWhereInput
    /**
     * Limit how many SSLCertificates to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SSLCertificateIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * SSLCertificate upsert
   */
  export type SSLCertificateUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SSLCertificate
     */
    select?: SSLCertificateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SSLCertificate
     */
    omit?: SSLCertificateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SSLCertificateInclude<ExtArgs> | null
    /**
     * The filter to search for the SSLCertificate to update in case it exists.
     */
    where: SSLCertificateWhereUniqueInput
    /**
     * In case the SSLCertificate found by the `where` argument doesn't exist, create a new SSLCertificate with this data.
     */
    create: XOR<SSLCertificateCreateInput, SSLCertificateUncheckedCreateInput>
    /**
     * In case the SSLCertificate was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SSLCertificateUpdateInput, SSLCertificateUncheckedUpdateInput>
  }

  /**
   * SSLCertificate delete
   */
  export type SSLCertificateDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SSLCertificate
     */
    select?: SSLCertificateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SSLCertificate
     */
    omit?: SSLCertificateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SSLCertificateInclude<ExtArgs> | null
    /**
     * Filter which SSLCertificate to delete.
     */
    where: SSLCertificateWhereUniqueInput
  }

  /**
   * SSLCertificate deleteMany
   */
  export type SSLCertificateDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SSLCertificates to delete
     */
    where?: SSLCertificateWhereInput
    /**
     * Limit how many SSLCertificates to delete.
     */
    limit?: number
  }

  /**
   * SSLCertificate without action
   */
  export type SSLCertificateDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SSLCertificate
     */
    select?: SSLCertificateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SSLCertificate
     */
    omit?: SSLCertificateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SSLCertificateInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    email: 'email',
    username: 'username',
    password: 'password',
    fullName: 'fullName',
    phoneNumber: 'phoneNumber',
    hashedRt: 'hashedRt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const WebsiteScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    name: 'name',
    domain: 'domain',
    port: 'port',
    isActive: 'isActive',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type WebsiteScalarFieldEnum = (typeof WebsiteScalarFieldEnum)[keyof typeof WebsiteScalarFieldEnum]


  export const WebsiteMetricScalarFieldEnum: {
    id: 'id',
    websiteId: 'websiteId'
  };

  export type WebsiteMetricScalarFieldEnum = (typeof WebsiteMetricScalarFieldEnum)[keyof typeof WebsiteMetricScalarFieldEnum]


  export const SSLCertificateScalarFieldEnum: {
    id: 'id',
    websiteId: 'websiteId',
    issuer: 'issuer',
    subject: 'subject',
    validFrom: 'validFrom',
    validTo: 'validTo',
    isValid: 'isValid',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type SSLCertificateScalarFieldEnum = (typeof SSLCertificateScalarFieldEnum)[keyof typeof SSLCertificateScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: UuidFilter<"User"> | string
    email?: StringNullableFilter<"User"> | string | null
    username?: StringFilter<"User"> | string
    password?: StringFilter<"User"> | string
    fullName?: StringNullableFilter<"User"> | string | null
    phoneNumber?: StringNullableFilter<"User"> | string | null
    hashedRt?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    websites?: WebsiteListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    email?: SortOrderInput | SortOrder
    username?: SortOrder
    password?: SortOrder
    fullName?: SortOrderInput | SortOrder
    phoneNumber?: SortOrderInput | SortOrder
    hashedRt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    websites?: WebsiteOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    username?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    password?: StringFilter<"User"> | string
    fullName?: StringNullableFilter<"User"> | string | null
    phoneNumber?: StringNullableFilter<"User"> | string | null
    hashedRt?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    websites?: WebsiteListRelationFilter
  }, "id" | "email" | "username">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    email?: SortOrderInput | SortOrder
    username?: SortOrder
    password?: SortOrder
    fullName?: SortOrderInput | SortOrder
    phoneNumber?: SortOrderInput | SortOrder
    hashedRt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"User"> | string
    email?: StringNullableWithAggregatesFilter<"User"> | string | null
    username?: StringWithAggregatesFilter<"User"> | string
    password?: StringWithAggregatesFilter<"User"> | string
    fullName?: StringNullableWithAggregatesFilter<"User"> | string | null
    phoneNumber?: StringNullableWithAggregatesFilter<"User"> | string | null
    hashedRt?: StringNullableWithAggregatesFilter<"User"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type WebsiteWhereInput = {
    AND?: WebsiteWhereInput | WebsiteWhereInput[]
    OR?: WebsiteWhereInput[]
    NOT?: WebsiteWhereInput | WebsiteWhereInput[]
    id?: UuidFilter<"Website"> | string
    userId?: StringFilter<"Website"> | string
    name?: StringFilter<"Website"> | string
    domain?: StringFilter<"Website"> | string
    port?: IntNullableFilter<"Website"> | number | null
    isActive?: BoolFilter<"Website"> | boolean
    createdAt?: DateTimeFilter<"Website"> | Date | string
    updatedAt?: DateTimeFilter<"Website"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    metrics?: WebsiteMetricListRelationFilter
    ssl?: XOR<SSLCertificateNullableScalarRelationFilter, SSLCertificateWhereInput> | null
  }

  export type WebsiteOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    domain?: SortOrder
    port?: SortOrderInput | SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
    metrics?: WebsiteMetricOrderByRelationAggregateInput
    ssl?: SSLCertificateOrderByWithRelationInput
  }

  export type WebsiteWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    domain?: string
    AND?: WebsiteWhereInput | WebsiteWhereInput[]
    OR?: WebsiteWhereInput[]
    NOT?: WebsiteWhereInput | WebsiteWhereInput[]
    userId?: StringFilter<"Website"> | string
    name?: StringFilter<"Website"> | string
    port?: IntNullableFilter<"Website"> | number | null
    isActive?: BoolFilter<"Website"> | boolean
    createdAt?: DateTimeFilter<"Website"> | Date | string
    updatedAt?: DateTimeFilter<"Website"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    metrics?: WebsiteMetricListRelationFilter
    ssl?: XOR<SSLCertificateNullableScalarRelationFilter, SSLCertificateWhereInput> | null
  }, "id" | "domain">

  export type WebsiteOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    domain?: SortOrder
    port?: SortOrderInput | SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: WebsiteCountOrderByAggregateInput
    _avg?: WebsiteAvgOrderByAggregateInput
    _max?: WebsiteMaxOrderByAggregateInput
    _min?: WebsiteMinOrderByAggregateInput
    _sum?: WebsiteSumOrderByAggregateInput
  }

  export type WebsiteScalarWhereWithAggregatesInput = {
    AND?: WebsiteScalarWhereWithAggregatesInput | WebsiteScalarWhereWithAggregatesInput[]
    OR?: WebsiteScalarWhereWithAggregatesInput[]
    NOT?: WebsiteScalarWhereWithAggregatesInput | WebsiteScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"Website"> | string
    userId?: StringWithAggregatesFilter<"Website"> | string
    name?: StringWithAggregatesFilter<"Website"> | string
    domain?: StringWithAggregatesFilter<"Website"> | string
    port?: IntNullableWithAggregatesFilter<"Website"> | number | null
    isActive?: BoolWithAggregatesFilter<"Website"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"Website"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Website"> | Date | string
  }

  export type WebsiteMetricWhereInput = {
    AND?: WebsiteMetricWhereInput | WebsiteMetricWhereInput[]
    OR?: WebsiteMetricWhereInput[]
    NOT?: WebsiteMetricWhereInput | WebsiteMetricWhereInput[]
    id?: UuidFilter<"WebsiteMetric"> | string
    websiteId?: StringFilter<"WebsiteMetric"> | string
    website?: XOR<WebsiteScalarRelationFilter, WebsiteWhereInput>
  }

  export type WebsiteMetricOrderByWithRelationInput = {
    id?: SortOrder
    websiteId?: SortOrder
    website?: WebsiteOrderByWithRelationInput
  }

  export type WebsiteMetricWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: WebsiteMetricWhereInput | WebsiteMetricWhereInput[]
    OR?: WebsiteMetricWhereInput[]
    NOT?: WebsiteMetricWhereInput | WebsiteMetricWhereInput[]
    websiteId?: StringFilter<"WebsiteMetric"> | string
    website?: XOR<WebsiteScalarRelationFilter, WebsiteWhereInput>
  }, "id">

  export type WebsiteMetricOrderByWithAggregationInput = {
    id?: SortOrder
    websiteId?: SortOrder
    _count?: WebsiteMetricCountOrderByAggregateInput
    _max?: WebsiteMetricMaxOrderByAggregateInput
    _min?: WebsiteMetricMinOrderByAggregateInput
  }

  export type WebsiteMetricScalarWhereWithAggregatesInput = {
    AND?: WebsiteMetricScalarWhereWithAggregatesInput | WebsiteMetricScalarWhereWithAggregatesInput[]
    OR?: WebsiteMetricScalarWhereWithAggregatesInput[]
    NOT?: WebsiteMetricScalarWhereWithAggregatesInput | WebsiteMetricScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"WebsiteMetric"> | string
    websiteId?: StringWithAggregatesFilter<"WebsiteMetric"> | string
  }

  export type SSLCertificateWhereInput = {
    AND?: SSLCertificateWhereInput | SSLCertificateWhereInput[]
    OR?: SSLCertificateWhereInput[]
    NOT?: SSLCertificateWhereInput | SSLCertificateWhereInput[]
    id?: UuidFilter<"SSLCertificate"> | string
    websiteId?: StringFilter<"SSLCertificate"> | string
    issuer?: StringNullableFilter<"SSLCertificate"> | string | null
    subject?: StringNullableFilter<"SSLCertificate"> | string | null
    validFrom?: DateTimeNullableFilter<"SSLCertificate"> | Date | string | null
    validTo?: DateTimeNullableFilter<"SSLCertificate"> | Date | string | null
    isValid?: BoolFilter<"SSLCertificate"> | boolean
    createdAt?: DateTimeFilter<"SSLCertificate"> | Date | string
    updatedAt?: DateTimeFilter<"SSLCertificate"> | Date | string
    website?: XOR<WebsiteScalarRelationFilter, WebsiteWhereInput>
  }

  export type SSLCertificateOrderByWithRelationInput = {
    id?: SortOrder
    websiteId?: SortOrder
    issuer?: SortOrderInput | SortOrder
    subject?: SortOrderInput | SortOrder
    validFrom?: SortOrderInput | SortOrder
    validTo?: SortOrderInput | SortOrder
    isValid?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    website?: WebsiteOrderByWithRelationInput
  }

  export type SSLCertificateWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    websiteId?: string
    AND?: SSLCertificateWhereInput | SSLCertificateWhereInput[]
    OR?: SSLCertificateWhereInput[]
    NOT?: SSLCertificateWhereInput | SSLCertificateWhereInput[]
    issuer?: StringNullableFilter<"SSLCertificate"> | string | null
    subject?: StringNullableFilter<"SSLCertificate"> | string | null
    validFrom?: DateTimeNullableFilter<"SSLCertificate"> | Date | string | null
    validTo?: DateTimeNullableFilter<"SSLCertificate"> | Date | string | null
    isValid?: BoolFilter<"SSLCertificate"> | boolean
    createdAt?: DateTimeFilter<"SSLCertificate"> | Date | string
    updatedAt?: DateTimeFilter<"SSLCertificate"> | Date | string
    website?: XOR<WebsiteScalarRelationFilter, WebsiteWhereInput>
  }, "id" | "websiteId">

  export type SSLCertificateOrderByWithAggregationInput = {
    id?: SortOrder
    websiteId?: SortOrder
    issuer?: SortOrderInput | SortOrder
    subject?: SortOrderInput | SortOrder
    validFrom?: SortOrderInput | SortOrder
    validTo?: SortOrderInput | SortOrder
    isValid?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: SSLCertificateCountOrderByAggregateInput
    _max?: SSLCertificateMaxOrderByAggregateInput
    _min?: SSLCertificateMinOrderByAggregateInput
  }

  export type SSLCertificateScalarWhereWithAggregatesInput = {
    AND?: SSLCertificateScalarWhereWithAggregatesInput | SSLCertificateScalarWhereWithAggregatesInput[]
    OR?: SSLCertificateScalarWhereWithAggregatesInput[]
    NOT?: SSLCertificateScalarWhereWithAggregatesInput | SSLCertificateScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"SSLCertificate"> | string
    websiteId?: StringWithAggregatesFilter<"SSLCertificate"> | string
    issuer?: StringNullableWithAggregatesFilter<"SSLCertificate"> | string | null
    subject?: StringNullableWithAggregatesFilter<"SSLCertificate"> | string | null
    validFrom?: DateTimeNullableWithAggregatesFilter<"SSLCertificate"> | Date | string | null
    validTo?: DateTimeNullableWithAggregatesFilter<"SSLCertificate"> | Date | string | null
    isValid?: BoolWithAggregatesFilter<"SSLCertificate"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"SSLCertificate"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"SSLCertificate"> | Date | string
  }

  export type UserCreateInput = {
    id?: string
    email?: string | null
    username: string
    password: string
    fullName?: string | null
    phoneNumber?: string | null
    hashedRt?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    websites?: WebsiteCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    email?: string | null
    username: string
    password: string
    fullName?: string | null
    phoneNumber?: string | null
    hashedRt?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    websites?: WebsiteUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    username?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    fullName?: NullableStringFieldUpdateOperationsInput | string | null
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    hashedRt?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    websites?: WebsiteUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    username?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    fullName?: NullableStringFieldUpdateOperationsInput | string | null
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    hashedRt?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    websites?: WebsiteUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateManyInput = {
    id?: string
    email?: string | null
    username: string
    password: string
    fullName?: string | null
    phoneNumber?: string | null
    hashedRt?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    username?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    fullName?: NullableStringFieldUpdateOperationsInput | string | null
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    hashedRt?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    username?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    fullName?: NullableStringFieldUpdateOperationsInput | string | null
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    hashedRt?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WebsiteCreateInput = {
    id?: string
    name: string
    domain: string
    port?: number | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutWebsitesInput
    metrics?: WebsiteMetricCreateNestedManyWithoutWebsiteInput
    ssl?: SSLCertificateCreateNestedOneWithoutWebsiteInput
  }

  export type WebsiteUncheckedCreateInput = {
    id?: string
    userId: string
    name: string
    domain: string
    port?: number | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    metrics?: WebsiteMetricUncheckedCreateNestedManyWithoutWebsiteInput
    ssl?: SSLCertificateUncheckedCreateNestedOneWithoutWebsiteInput
  }

  export type WebsiteUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    port?: NullableIntFieldUpdateOperationsInput | number | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutWebsitesNestedInput
    metrics?: WebsiteMetricUpdateManyWithoutWebsiteNestedInput
    ssl?: SSLCertificateUpdateOneWithoutWebsiteNestedInput
  }

  export type WebsiteUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    port?: NullableIntFieldUpdateOperationsInput | number | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    metrics?: WebsiteMetricUncheckedUpdateManyWithoutWebsiteNestedInput
    ssl?: SSLCertificateUncheckedUpdateOneWithoutWebsiteNestedInput
  }

  export type WebsiteCreateManyInput = {
    id?: string
    userId: string
    name: string
    domain: string
    port?: number | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type WebsiteUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    port?: NullableIntFieldUpdateOperationsInput | number | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WebsiteUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    port?: NullableIntFieldUpdateOperationsInput | number | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WebsiteMetricCreateInput = {
    id?: string
    website: WebsiteCreateNestedOneWithoutMetricsInput
  }

  export type WebsiteMetricUncheckedCreateInput = {
    id?: string
    websiteId: string
  }

  export type WebsiteMetricUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    website?: WebsiteUpdateOneRequiredWithoutMetricsNestedInput
  }

  export type WebsiteMetricUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    websiteId?: StringFieldUpdateOperationsInput | string
  }

  export type WebsiteMetricCreateManyInput = {
    id?: string
    websiteId: string
  }

  export type WebsiteMetricUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
  }

  export type WebsiteMetricUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    websiteId?: StringFieldUpdateOperationsInput | string
  }

  export type SSLCertificateCreateInput = {
    id?: string
    issuer?: string | null
    subject?: string | null
    validFrom?: Date | string | null
    validTo?: Date | string | null
    isValid?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    website: WebsiteCreateNestedOneWithoutSslInput
  }

  export type SSLCertificateUncheckedCreateInput = {
    id?: string
    websiteId: string
    issuer?: string | null
    subject?: string | null
    validFrom?: Date | string | null
    validTo?: Date | string | null
    isValid?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SSLCertificateUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    issuer?: NullableStringFieldUpdateOperationsInput | string | null
    subject?: NullableStringFieldUpdateOperationsInput | string | null
    validFrom?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    validTo?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isValid?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    website?: WebsiteUpdateOneRequiredWithoutSslNestedInput
  }

  export type SSLCertificateUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    websiteId?: StringFieldUpdateOperationsInput | string
    issuer?: NullableStringFieldUpdateOperationsInput | string | null
    subject?: NullableStringFieldUpdateOperationsInput | string | null
    validFrom?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    validTo?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isValid?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SSLCertificateCreateManyInput = {
    id?: string
    websiteId: string
    issuer?: string | null
    subject?: string | null
    validFrom?: Date | string | null
    validTo?: Date | string | null
    isValid?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SSLCertificateUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    issuer?: NullableStringFieldUpdateOperationsInput | string | null
    subject?: NullableStringFieldUpdateOperationsInput | string | null
    validFrom?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    validTo?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isValid?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SSLCertificateUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    websiteId?: StringFieldUpdateOperationsInput | string
    issuer?: NullableStringFieldUpdateOperationsInput | string | null
    subject?: NullableStringFieldUpdateOperationsInput | string | null
    validFrom?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    validTo?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isValid?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type WebsiteListRelationFilter = {
    every?: WebsiteWhereInput
    some?: WebsiteWhereInput
    none?: WebsiteWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type WebsiteOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    username?: SortOrder
    password?: SortOrder
    fullName?: SortOrder
    phoneNumber?: SortOrder
    hashedRt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    username?: SortOrder
    password?: SortOrder
    fullName?: SortOrder
    phoneNumber?: SortOrder
    hashedRt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    username?: SortOrder
    password?: SortOrder
    fullName?: SortOrder
    phoneNumber?: SortOrder
    hashedRt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type UserScalarRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type WebsiteMetricListRelationFilter = {
    every?: WebsiteMetricWhereInput
    some?: WebsiteMetricWhereInput
    none?: WebsiteMetricWhereInput
  }

  export type SSLCertificateNullableScalarRelationFilter = {
    is?: SSLCertificateWhereInput | null
    isNot?: SSLCertificateWhereInput | null
  }

  export type WebsiteMetricOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type WebsiteCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    domain?: SortOrder
    port?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type WebsiteAvgOrderByAggregateInput = {
    port?: SortOrder
  }

  export type WebsiteMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    domain?: SortOrder
    port?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type WebsiteMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    domain?: SortOrder
    port?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type WebsiteSumOrderByAggregateInput = {
    port?: SortOrder
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type WebsiteScalarRelationFilter = {
    is?: WebsiteWhereInput
    isNot?: WebsiteWhereInput
  }

  export type WebsiteMetricCountOrderByAggregateInput = {
    id?: SortOrder
    websiteId?: SortOrder
  }

  export type WebsiteMetricMaxOrderByAggregateInput = {
    id?: SortOrder
    websiteId?: SortOrder
  }

  export type WebsiteMetricMinOrderByAggregateInput = {
    id?: SortOrder
    websiteId?: SortOrder
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type SSLCertificateCountOrderByAggregateInput = {
    id?: SortOrder
    websiteId?: SortOrder
    issuer?: SortOrder
    subject?: SortOrder
    validFrom?: SortOrder
    validTo?: SortOrder
    isValid?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SSLCertificateMaxOrderByAggregateInput = {
    id?: SortOrder
    websiteId?: SortOrder
    issuer?: SortOrder
    subject?: SortOrder
    validFrom?: SortOrder
    validTo?: SortOrder
    isValid?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SSLCertificateMinOrderByAggregateInput = {
    id?: SortOrder
    websiteId?: SortOrder
    issuer?: SortOrder
    subject?: SortOrder
    validFrom?: SortOrder
    validTo?: SortOrder
    isValid?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type WebsiteCreateNestedManyWithoutUserInput = {
    create?: XOR<WebsiteCreateWithoutUserInput, WebsiteUncheckedCreateWithoutUserInput> | WebsiteCreateWithoutUserInput[] | WebsiteUncheckedCreateWithoutUserInput[]
    connectOrCreate?: WebsiteCreateOrConnectWithoutUserInput | WebsiteCreateOrConnectWithoutUserInput[]
    createMany?: WebsiteCreateManyUserInputEnvelope
    connect?: WebsiteWhereUniqueInput | WebsiteWhereUniqueInput[]
  }

  export type WebsiteUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<WebsiteCreateWithoutUserInput, WebsiteUncheckedCreateWithoutUserInput> | WebsiteCreateWithoutUserInput[] | WebsiteUncheckedCreateWithoutUserInput[]
    connectOrCreate?: WebsiteCreateOrConnectWithoutUserInput | WebsiteCreateOrConnectWithoutUserInput[]
    createMany?: WebsiteCreateManyUserInputEnvelope
    connect?: WebsiteWhereUniqueInput | WebsiteWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type WebsiteUpdateManyWithoutUserNestedInput = {
    create?: XOR<WebsiteCreateWithoutUserInput, WebsiteUncheckedCreateWithoutUserInput> | WebsiteCreateWithoutUserInput[] | WebsiteUncheckedCreateWithoutUserInput[]
    connectOrCreate?: WebsiteCreateOrConnectWithoutUserInput | WebsiteCreateOrConnectWithoutUserInput[]
    upsert?: WebsiteUpsertWithWhereUniqueWithoutUserInput | WebsiteUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: WebsiteCreateManyUserInputEnvelope
    set?: WebsiteWhereUniqueInput | WebsiteWhereUniqueInput[]
    disconnect?: WebsiteWhereUniqueInput | WebsiteWhereUniqueInput[]
    delete?: WebsiteWhereUniqueInput | WebsiteWhereUniqueInput[]
    connect?: WebsiteWhereUniqueInput | WebsiteWhereUniqueInput[]
    update?: WebsiteUpdateWithWhereUniqueWithoutUserInput | WebsiteUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: WebsiteUpdateManyWithWhereWithoutUserInput | WebsiteUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: WebsiteScalarWhereInput | WebsiteScalarWhereInput[]
  }

  export type WebsiteUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<WebsiteCreateWithoutUserInput, WebsiteUncheckedCreateWithoutUserInput> | WebsiteCreateWithoutUserInput[] | WebsiteUncheckedCreateWithoutUserInput[]
    connectOrCreate?: WebsiteCreateOrConnectWithoutUserInput | WebsiteCreateOrConnectWithoutUserInput[]
    upsert?: WebsiteUpsertWithWhereUniqueWithoutUserInput | WebsiteUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: WebsiteCreateManyUserInputEnvelope
    set?: WebsiteWhereUniqueInput | WebsiteWhereUniqueInput[]
    disconnect?: WebsiteWhereUniqueInput | WebsiteWhereUniqueInput[]
    delete?: WebsiteWhereUniqueInput | WebsiteWhereUniqueInput[]
    connect?: WebsiteWhereUniqueInput | WebsiteWhereUniqueInput[]
    update?: WebsiteUpdateWithWhereUniqueWithoutUserInput | WebsiteUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: WebsiteUpdateManyWithWhereWithoutUserInput | WebsiteUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: WebsiteScalarWhereInput | WebsiteScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutWebsitesInput = {
    create?: XOR<UserCreateWithoutWebsitesInput, UserUncheckedCreateWithoutWebsitesInput>
    connectOrCreate?: UserCreateOrConnectWithoutWebsitesInput
    connect?: UserWhereUniqueInput
  }

  export type WebsiteMetricCreateNestedManyWithoutWebsiteInput = {
    create?: XOR<WebsiteMetricCreateWithoutWebsiteInput, WebsiteMetricUncheckedCreateWithoutWebsiteInput> | WebsiteMetricCreateWithoutWebsiteInput[] | WebsiteMetricUncheckedCreateWithoutWebsiteInput[]
    connectOrCreate?: WebsiteMetricCreateOrConnectWithoutWebsiteInput | WebsiteMetricCreateOrConnectWithoutWebsiteInput[]
    createMany?: WebsiteMetricCreateManyWebsiteInputEnvelope
    connect?: WebsiteMetricWhereUniqueInput | WebsiteMetricWhereUniqueInput[]
  }

  export type SSLCertificateCreateNestedOneWithoutWebsiteInput = {
    create?: XOR<SSLCertificateCreateWithoutWebsiteInput, SSLCertificateUncheckedCreateWithoutWebsiteInput>
    connectOrCreate?: SSLCertificateCreateOrConnectWithoutWebsiteInput
    connect?: SSLCertificateWhereUniqueInput
  }

  export type WebsiteMetricUncheckedCreateNestedManyWithoutWebsiteInput = {
    create?: XOR<WebsiteMetricCreateWithoutWebsiteInput, WebsiteMetricUncheckedCreateWithoutWebsiteInput> | WebsiteMetricCreateWithoutWebsiteInput[] | WebsiteMetricUncheckedCreateWithoutWebsiteInput[]
    connectOrCreate?: WebsiteMetricCreateOrConnectWithoutWebsiteInput | WebsiteMetricCreateOrConnectWithoutWebsiteInput[]
    createMany?: WebsiteMetricCreateManyWebsiteInputEnvelope
    connect?: WebsiteMetricWhereUniqueInput | WebsiteMetricWhereUniqueInput[]
  }

  export type SSLCertificateUncheckedCreateNestedOneWithoutWebsiteInput = {
    create?: XOR<SSLCertificateCreateWithoutWebsiteInput, SSLCertificateUncheckedCreateWithoutWebsiteInput>
    connectOrCreate?: SSLCertificateCreateOrConnectWithoutWebsiteInput
    connect?: SSLCertificateWhereUniqueInput
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type UserUpdateOneRequiredWithoutWebsitesNestedInput = {
    create?: XOR<UserCreateWithoutWebsitesInput, UserUncheckedCreateWithoutWebsitesInput>
    connectOrCreate?: UserCreateOrConnectWithoutWebsitesInput
    upsert?: UserUpsertWithoutWebsitesInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutWebsitesInput, UserUpdateWithoutWebsitesInput>, UserUncheckedUpdateWithoutWebsitesInput>
  }

  export type WebsiteMetricUpdateManyWithoutWebsiteNestedInput = {
    create?: XOR<WebsiteMetricCreateWithoutWebsiteInput, WebsiteMetricUncheckedCreateWithoutWebsiteInput> | WebsiteMetricCreateWithoutWebsiteInput[] | WebsiteMetricUncheckedCreateWithoutWebsiteInput[]
    connectOrCreate?: WebsiteMetricCreateOrConnectWithoutWebsiteInput | WebsiteMetricCreateOrConnectWithoutWebsiteInput[]
    upsert?: WebsiteMetricUpsertWithWhereUniqueWithoutWebsiteInput | WebsiteMetricUpsertWithWhereUniqueWithoutWebsiteInput[]
    createMany?: WebsiteMetricCreateManyWebsiteInputEnvelope
    set?: WebsiteMetricWhereUniqueInput | WebsiteMetricWhereUniqueInput[]
    disconnect?: WebsiteMetricWhereUniqueInput | WebsiteMetricWhereUniqueInput[]
    delete?: WebsiteMetricWhereUniqueInput | WebsiteMetricWhereUniqueInput[]
    connect?: WebsiteMetricWhereUniqueInput | WebsiteMetricWhereUniqueInput[]
    update?: WebsiteMetricUpdateWithWhereUniqueWithoutWebsiteInput | WebsiteMetricUpdateWithWhereUniqueWithoutWebsiteInput[]
    updateMany?: WebsiteMetricUpdateManyWithWhereWithoutWebsiteInput | WebsiteMetricUpdateManyWithWhereWithoutWebsiteInput[]
    deleteMany?: WebsiteMetricScalarWhereInput | WebsiteMetricScalarWhereInput[]
  }

  export type SSLCertificateUpdateOneWithoutWebsiteNestedInput = {
    create?: XOR<SSLCertificateCreateWithoutWebsiteInput, SSLCertificateUncheckedCreateWithoutWebsiteInput>
    connectOrCreate?: SSLCertificateCreateOrConnectWithoutWebsiteInput
    upsert?: SSLCertificateUpsertWithoutWebsiteInput
    disconnect?: SSLCertificateWhereInput | boolean
    delete?: SSLCertificateWhereInput | boolean
    connect?: SSLCertificateWhereUniqueInput
    update?: XOR<XOR<SSLCertificateUpdateToOneWithWhereWithoutWebsiteInput, SSLCertificateUpdateWithoutWebsiteInput>, SSLCertificateUncheckedUpdateWithoutWebsiteInput>
  }

  export type WebsiteMetricUncheckedUpdateManyWithoutWebsiteNestedInput = {
    create?: XOR<WebsiteMetricCreateWithoutWebsiteInput, WebsiteMetricUncheckedCreateWithoutWebsiteInput> | WebsiteMetricCreateWithoutWebsiteInput[] | WebsiteMetricUncheckedCreateWithoutWebsiteInput[]
    connectOrCreate?: WebsiteMetricCreateOrConnectWithoutWebsiteInput | WebsiteMetricCreateOrConnectWithoutWebsiteInput[]
    upsert?: WebsiteMetricUpsertWithWhereUniqueWithoutWebsiteInput | WebsiteMetricUpsertWithWhereUniqueWithoutWebsiteInput[]
    createMany?: WebsiteMetricCreateManyWebsiteInputEnvelope
    set?: WebsiteMetricWhereUniqueInput | WebsiteMetricWhereUniqueInput[]
    disconnect?: WebsiteMetricWhereUniqueInput | WebsiteMetricWhereUniqueInput[]
    delete?: WebsiteMetricWhereUniqueInput | WebsiteMetricWhereUniqueInput[]
    connect?: WebsiteMetricWhereUniqueInput | WebsiteMetricWhereUniqueInput[]
    update?: WebsiteMetricUpdateWithWhereUniqueWithoutWebsiteInput | WebsiteMetricUpdateWithWhereUniqueWithoutWebsiteInput[]
    updateMany?: WebsiteMetricUpdateManyWithWhereWithoutWebsiteInput | WebsiteMetricUpdateManyWithWhereWithoutWebsiteInput[]
    deleteMany?: WebsiteMetricScalarWhereInput | WebsiteMetricScalarWhereInput[]
  }

  export type SSLCertificateUncheckedUpdateOneWithoutWebsiteNestedInput = {
    create?: XOR<SSLCertificateCreateWithoutWebsiteInput, SSLCertificateUncheckedCreateWithoutWebsiteInput>
    connectOrCreate?: SSLCertificateCreateOrConnectWithoutWebsiteInput
    upsert?: SSLCertificateUpsertWithoutWebsiteInput
    disconnect?: SSLCertificateWhereInput | boolean
    delete?: SSLCertificateWhereInput | boolean
    connect?: SSLCertificateWhereUniqueInput
    update?: XOR<XOR<SSLCertificateUpdateToOneWithWhereWithoutWebsiteInput, SSLCertificateUpdateWithoutWebsiteInput>, SSLCertificateUncheckedUpdateWithoutWebsiteInput>
  }

  export type WebsiteCreateNestedOneWithoutMetricsInput = {
    create?: XOR<WebsiteCreateWithoutMetricsInput, WebsiteUncheckedCreateWithoutMetricsInput>
    connectOrCreate?: WebsiteCreateOrConnectWithoutMetricsInput
    connect?: WebsiteWhereUniqueInput
  }

  export type WebsiteUpdateOneRequiredWithoutMetricsNestedInput = {
    create?: XOR<WebsiteCreateWithoutMetricsInput, WebsiteUncheckedCreateWithoutMetricsInput>
    connectOrCreate?: WebsiteCreateOrConnectWithoutMetricsInput
    upsert?: WebsiteUpsertWithoutMetricsInput
    connect?: WebsiteWhereUniqueInput
    update?: XOR<XOR<WebsiteUpdateToOneWithWhereWithoutMetricsInput, WebsiteUpdateWithoutMetricsInput>, WebsiteUncheckedUpdateWithoutMetricsInput>
  }

  export type WebsiteCreateNestedOneWithoutSslInput = {
    create?: XOR<WebsiteCreateWithoutSslInput, WebsiteUncheckedCreateWithoutSslInput>
    connectOrCreate?: WebsiteCreateOrConnectWithoutSslInput
    connect?: WebsiteWhereUniqueInput
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type WebsiteUpdateOneRequiredWithoutSslNestedInput = {
    create?: XOR<WebsiteCreateWithoutSslInput, WebsiteUncheckedCreateWithoutSslInput>
    connectOrCreate?: WebsiteCreateOrConnectWithoutSslInput
    upsert?: WebsiteUpsertWithoutSslInput
    connect?: WebsiteWhereUniqueInput
    update?: XOR<XOR<WebsiteUpdateToOneWithWhereWithoutSslInput, WebsiteUpdateWithoutSslInput>, WebsiteUncheckedUpdateWithoutSslInput>
  }

  export type NestedUuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedUuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type WebsiteCreateWithoutUserInput = {
    id?: string
    name: string
    domain: string
    port?: number | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    metrics?: WebsiteMetricCreateNestedManyWithoutWebsiteInput
    ssl?: SSLCertificateCreateNestedOneWithoutWebsiteInput
  }

  export type WebsiteUncheckedCreateWithoutUserInput = {
    id?: string
    name: string
    domain: string
    port?: number | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    metrics?: WebsiteMetricUncheckedCreateNestedManyWithoutWebsiteInput
    ssl?: SSLCertificateUncheckedCreateNestedOneWithoutWebsiteInput
  }

  export type WebsiteCreateOrConnectWithoutUserInput = {
    where: WebsiteWhereUniqueInput
    create: XOR<WebsiteCreateWithoutUserInput, WebsiteUncheckedCreateWithoutUserInput>
  }

  export type WebsiteCreateManyUserInputEnvelope = {
    data: WebsiteCreateManyUserInput | WebsiteCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type WebsiteUpsertWithWhereUniqueWithoutUserInput = {
    where: WebsiteWhereUniqueInput
    update: XOR<WebsiteUpdateWithoutUserInput, WebsiteUncheckedUpdateWithoutUserInput>
    create: XOR<WebsiteCreateWithoutUserInput, WebsiteUncheckedCreateWithoutUserInput>
  }

  export type WebsiteUpdateWithWhereUniqueWithoutUserInput = {
    where: WebsiteWhereUniqueInput
    data: XOR<WebsiteUpdateWithoutUserInput, WebsiteUncheckedUpdateWithoutUserInput>
  }

  export type WebsiteUpdateManyWithWhereWithoutUserInput = {
    where: WebsiteScalarWhereInput
    data: XOR<WebsiteUpdateManyMutationInput, WebsiteUncheckedUpdateManyWithoutUserInput>
  }

  export type WebsiteScalarWhereInput = {
    AND?: WebsiteScalarWhereInput | WebsiteScalarWhereInput[]
    OR?: WebsiteScalarWhereInput[]
    NOT?: WebsiteScalarWhereInput | WebsiteScalarWhereInput[]
    id?: UuidFilter<"Website"> | string
    userId?: StringFilter<"Website"> | string
    name?: StringFilter<"Website"> | string
    domain?: StringFilter<"Website"> | string
    port?: IntNullableFilter<"Website"> | number | null
    isActive?: BoolFilter<"Website"> | boolean
    createdAt?: DateTimeFilter<"Website"> | Date | string
    updatedAt?: DateTimeFilter<"Website"> | Date | string
  }

  export type UserCreateWithoutWebsitesInput = {
    id?: string
    email?: string | null
    username: string
    password: string
    fullName?: string | null
    phoneNumber?: string | null
    hashedRt?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUncheckedCreateWithoutWebsitesInput = {
    id?: string
    email?: string | null
    username: string
    password: string
    fullName?: string | null
    phoneNumber?: string | null
    hashedRt?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserCreateOrConnectWithoutWebsitesInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutWebsitesInput, UserUncheckedCreateWithoutWebsitesInput>
  }

  export type WebsiteMetricCreateWithoutWebsiteInput = {
    id?: string
  }

  export type WebsiteMetricUncheckedCreateWithoutWebsiteInput = {
    id?: string
  }

  export type WebsiteMetricCreateOrConnectWithoutWebsiteInput = {
    where: WebsiteMetricWhereUniqueInput
    create: XOR<WebsiteMetricCreateWithoutWebsiteInput, WebsiteMetricUncheckedCreateWithoutWebsiteInput>
  }

  export type WebsiteMetricCreateManyWebsiteInputEnvelope = {
    data: WebsiteMetricCreateManyWebsiteInput | WebsiteMetricCreateManyWebsiteInput[]
    skipDuplicates?: boolean
  }

  export type SSLCertificateCreateWithoutWebsiteInput = {
    id?: string
    issuer?: string | null
    subject?: string | null
    validFrom?: Date | string | null
    validTo?: Date | string | null
    isValid?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SSLCertificateUncheckedCreateWithoutWebsiteInput = {
    id?: string
    issuer?: string | null
    subject?: string | null
    validFrom?: Date | string | null
    validTo?: Date | string | null
    isValid?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SSLCertificateCreateOrConnectWithoutWebsiteInput = {
    where: SSLCertificateWhereUniqueInput
    create: XOR<SSLCertificateCreateWithoutWebsiteInput, SSLCertificateUncheckedCreateWithoutWebsiteInput>
  }

  export type UserUpsertWithoutWebsitesInput = {
    update: XOR<UserUpdateWithoutWebsitesInput, UserUncheckedUpdateWithoutWebsitesInput>
    create: XOR<UserCreateWithoutWebsitesInput, UserUncheckedCreateWithoutWebsitesInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutWebsitesInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutWebsitesInput, UserUncheckedUpdateWithoutWebsitesInput>
  }

  export type UserUpdateWithoutWebsitesInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    username?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    fullName?: NullableStringFieldUpdateOperationsInput | string | null
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    hashedRt?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateWithoutWebsitesInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    username?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    fullName?: NullableStringFieldUpdateOperationsInput | string | null
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    hashedRt?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WebsiteMetricUpsertWithWhereUniqueWithoutWebsiteInput = {
    where: WebsiteMetricWhereUniqueInput
    update: XOR<WebsiteMetricUpdateWithoutWebsiteInput, WebsiteMetricUncheckedUpdateWithoutWebsiteInput>
    create: XOR<WebsiteMetricCreateWithoutWebsiteInput, WebsiteMetricUncheckedCreateWithoutWebsiteInput>
  }

  export type WebsiteMetricUpdateWithWhereUniqueWithoutWebsiteInput = {
    where: WebsiteMetricWhereUniqueInput
    data: XOR<WebsiteMetricUpdateWithoutWebsiteInput, WebsiteMetricUncheckedUpdateWithoutWebsiteInput>
  }

  export type WebsiteMetricUpdateManyWithWhereWithoutWebsiteInput = {
    where: WebsiteMetricScalarWhereInput
    data: XOR<WebsiteMetricUpdateManyMutationInput, WebsiteMetricUncheckedUpdateManyWithoutWebsiteInput>
  }

  export type WebsiteMetricScalarWhereInput = {
    AND?: WebsiteMetricScalarWhereInput | WebsiteMetricScalarWhereInput[]
    OR?: WebsiteMetricScalarWhereInput[]
    NOT?: WebsiteMetricScalarWhereInput | WebsiteMetricScalarWhereInput[]
    id?: UuidFilter<"WebsiteMetric"> | string
    websiteId?: StringFilter<"WebsiteMetric"> | string
  }

  export type SSLCertificateUpsertWithoutWebsiteInput = {
    update: XOR<SSLCertificateUpdateWithoutWebsiteInput, SSLCertificateUncheckedUpdateWithoutWebsiteInput>
    create: XOR<SSLCertificateCreateWithoutWebsiteInput, SSLCertificateUncheckedCreateWithoutWebsiteInput>
    where?: SSLCertificateWhereInput
  }

  export type SSLCertificateUpdateToOneWithWhereWithoutWebsiteInput = {
    where?: SSLCertificateWhereInput
    data: XOR<SSLCertificateUpdateWithoutWebsiteInput, SSLCertificateUncheckedUpdateWithoutWebsiteInput>
  }

  export type SSLCertificateUpdateWithoutWebsiteInput = {
    id?: StringFieldUpdateOperationsInput | string
    issuer?: NullableStringFieldUpdateOperationsInput | string | null
    subject?: NullableStringFieldUpdateOperationsInput | string | null
    validFrom?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    validTo?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isValid?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SSLCertificateUncheckedUpdateWithoutWebsiteInput = {
    id?: StringFieldUpdateOperationsInput | string
    issuer?: NullableStringFieldUpdateOperationsInput | string | null
    subject?: NullableStringFieldUpdateOperationsInput | string | null
    validFrom?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    validTo?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isValid?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WebsiteCreateWithoutMetricsInput = {
    id?: string
    name: string
    domain: string
    port?: number | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutWebsitesInput
    ssl?: SSLCertificateCreateNestedOneWithoutWebsiteInput
  }

  export type WebsiteUncheckedCreateWithoutMetricsInput = {
    id?: string
    userId: string
    name: string
    domain: string
    port?: number | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    ssl?: SSLCertificateUncheckedCreateNestedOneWithoutWebsiteInput
  }

  export type WebsiteCreateOrConnectWithoutMetricsInput = {
    where: WebsiteWhereUniqueInput
    create: XOR<WebsiteCreateWithoutMetricsInput, WebsiteUncheckedCreateWithoutMetricsInput>
  }

  export type WebsiteUpsertWithoutMetricsInput = {
    update: XOR<WebsiteUpdateWithoutMetricsInput, WebsiteUncheckedUpdateWithoutMetricsInput>
    create: XOR<WebsiteCreateWithoutMetricsInput, WebsiteUncheckedCreateWithoutMetricsInput>
    where?: WebsiteWhereInput
  }

  export type WebsiteUpdateToOneWithWhereWithoutMetricsInput = {
    where?: WebsiteWhereInput
    data: XOR<WebsiteUpdateWithoutMetricsInput, WebsiteUncheckedUpdateWithoutMetricsInput>
  }

  export type WebsiteUpdateWithoutMetricsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    port?: NullableIntFieldUpdateOperationsInput | number | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutWebsitesNestedInput
    ssl?: SSLCertificateUpdateOneWithoutWebsiteNestedInput
  }

  export type WebsiteUncheckedUpdateWithoutMetricsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    port?: NullableIntFieldUpdateOperationsInput | number | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ssl?: SSLCertificateUncheckedUpdateOneWithoutWebsiteNestedInput
  }

  export type WebsiteCreateWithoutSslInput = {
    id?: string
    name: string
    domain: string
    port?: number | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutWebsitesInput
    metrics?: WebsiteMetricCreateNestedManyWithoutWebsiteInput
  }

  export type WebsiteUncheckedCreateWithoutSslInput = {
    id?: string
    userId: string
    name: string
    domain: string
    port?: number | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    metrics?: WebsiteMetricUncheckedCreateNestedManyWithoutWebsiteInput
  }

  export type WebsiteCreateOrConnectWithoutSslInput = {
    where: WebsiteWhereUniqueInput
    create: XOR<WebsiteCreateWithoutSslInput, WebsiteUncheckedCreateWithoutSslInput>
  }

  export type WebsiteUpsertWithoutSslInput = {
    update: XOR<WebsiteUpdateWithoutSslInput, WebsiteUncheckedUpdateWithoutSslInput>
    create: XOR<WebsiteCreateWithoutSslInput, WebsiteUncheckedCreateWithoutSslInput>
    where?: WebsiteWhereInput
  }

  export type WebsiteUpdateToOneWithWhereWithoutSslInput = {
    where?: WebsiteWhereInput
    data: XOR<WebsiteUpdateWithoutSslInput, WebsiteUncheckedUpdateWithoutSslInput>
  }

  export type WebsiteUpdateWithoutSslInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    port?: NullableIntFieldUpdateOperationsInput | number | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutWebsitesNestedInput
    metrics?: WebsiteMetricUpdateManyWithoutWebsiteNestedInput
  }

  export type WebsiteUncheckedUpdateWithoutSslInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    port?: NullableIntFieldUpdateOperationsInput | number | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    metrics?: WebsiteMetricUncheckedUpdateManyWithoutWebsiteNestedInput
  }

  export type WebsiteCreateManyUserInput = {
    id?: string
    name: string
    domain: string
    port?: number | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type WebsiteUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    port?: NullableIntFieldUpdateOperationsInput | number | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    metrics?: WebsiteMetricUpdateManyWithoutWebsiteNestedInput
    ssl?: SSLCertificateUpdateOneWithoutWebsiteNestedInput
  }

  export type WebsiteUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    port?: NullableIntFieldUpdateOperationsInput | number | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    metrics?: WebsiteMetricUncheckedUpdateManyWithoutWebsiteNestedInput
    ssl?: SSLCertificateUncheckedUpdateOneWithoutWebsiteNestedInput
  }

  export type WebsiteUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    domain?: StringFieldUpdateOperationsInput | string
    port?: NullableIntFieldUpdateOperationsInput | number | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WebsiteMetricCreateManyWebsiteInput = {
    id?: string
  }

  export type WebsiteMetricUpdateWithoutWebsiteInput = {
    id?: StringFieldUpdateOperationsInput | string
  }

  export type WebsiteMetricUncheckedUpdateWithoutWebsiteInput = {
    id?: StringFieldUpdateOperationsInput | string
  }

  export type WebsiteMetricUncheckedUpdateManyWithoutWebsiteInput = {
    id?: StringFieldUpdateOperationsInput | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}
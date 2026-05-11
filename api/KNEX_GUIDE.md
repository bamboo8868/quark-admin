# Knex.js 使用教程

本项目使用 [Knex.js](https://knexjs.org/) 作为 SQL 查询构建器和数据库迁移工具。

---

## 目录

- [1. 环境配置](#1-环境配置)
- [2. 数据库连接](#2-数据库连接)
- [3. 迁移 (Migrations)](#3-迁移-migrations)
- [4. 种子数据 (Seeds)](#4-种子数据-seeds)
- [5. 查询构建器](#5-查询构建器)
- [6. BaseModel 基类](#6-basemodel-基类)
- [7. 自定义 Model 示例](#7-自定义-model-示例)
- [8. 事务处理](#8-事务处理)
- [9. 常用命令速查](#9-常用命令速查)

---

## 1. 环境配置

数据库连接信息在 `.env` 文件中配置：

```env
DB_CLIENT=mysql2
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=zshop
DB_USER=root
DB_PASSWORD=root
DB_POOL_MIN=2
DB_POOL_MAX=10
```

`knexfile.js` 读取这些环境变量并导出对应环境的配置。

---

## 2. 数据库连接

应用运行时通过 `src/config/database.js` 获取数据库实例（单例模式）：

```js
import { getDatabase } from '../config/database.js';

const db = getDatabase();

// 基本查询
const users = await db('users').where('status', 1);
```

> 注意：不要自行 `import knex` 创建新实例，始终使用 `getDatabase()` 获取共享连接。

---

## 3. 迁移 (Migrations)

### 3.1 迁移文件命名

迁移文件位于 `migrations/` 目录，命名格式为 `{timestamp}_{description}.js`，按时间戳顺序执行。

### 3.2 创建迁移文件

手动在 `migrations/` 目录下创建文件，建议使用递增编号命名：

```
migrations/
  20240417000001_create_depts_table.js
  20240417000002_create_users_table.js
  20240417000003_create_roles_table.js
  ...
```

### 3.3 迁移文件结构

每个迁移文件必须导出 `up` 和 `down` 两个异步函数：

```js
/**
 * Create xxx table
 */
export async function up(knex) {
  await knex.schema.createTable('table_name', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.tinyint('status').defaultTo(1).comment('0: disabled, 1: enabled');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 创建索引（单独一步，避免部分数据库不支持内联创建索引）
  await knex.schema.table('table_name', (table) => {
    table.index('status');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('table_name');
}
```

### 3.4 常用列类型

| Knex 方法 | MySQL 类型 | 说明 |
|-----------|-----------|------|
| `table.increments('id')` | INT AUTO_INCREMENT | 自增主键 |
| `table.string('name', 100)` | VARCHAR(100) | 定长字符串 |
| `table.text('content')` | TEXT | 长文本 |
| `table.integer('count')` | INT | 整数 |
| `table.tinyint('status')` | TINYINT | 小整数（常用于状态） |
| `table.boolean('active')` | TINYINT(1) | 布尔值 |
| `table.timestamp('created_at')` | TIMESTAMP | 时间戳 |
| `table.json('meta')` | JSON (MySQL 5.7+) | JSON 数据 |

### 3.5 常用列约束

```js
table.string('username', 50).notNullable().unique();    // 非空 + 唯一
table.integer('dept_id').unsigned().notNullable().defaultTo(0);  // 无符号 + 非空 + 默认值
table.tinyint('status').defaultTo(1).comment('0: disabled, 1: enabled');  // 注释
table.timestamp('deleted_at').nullable();  // 可空
```

### 3.6 索引

```js
// 在 createTable 内创建索引（部分数据库支持）
table.index('status');

// 推荐：单独创建索引
await knex.schema.table('users', (table) => {
  table.index('username');
  table.index(['dept_id', 'status']);  // 复合索引
  table.unique(['role_id', 'menu_id']);  // 唯一约束
});
```

### 3.7 项目约定

- **不使用外键**：表间关系由应用层保证，迁移文件中不使用 `.references().inTable().onDelete()`
- **ALTER TABLE 合并到 CREATE TABLE**：追加的列直接写在建表语句中，不单独建 ALTER 迁移文件
- **索引单独创建**：在建表后用 `knex.schema.table()` 添加索引，兼容所有数据库
- **默认值**：字符串字段给 `defaultTo('')`，数值字段给 `defaultTo(0)`，避免 NULL

### 3.8 执行迁移

```bash
# 开发环境：执行所有未执行的迁移
npm run migrate

# 生产环境
npm run migrate:prod

# 回滚最近一批迁移
npm run migrate:rollback
```

---

## 4. 种子数据 (Seeds)

### 4.1 种子文件结构

种子文件位于 `seeds/` 目录，文件名前缀数字决定执行顺序：

```
seeds/
  01_depts.js
  02_roles.js
  03_menus.js
  04_users.js
  05_role_menus.js
```

### 4.2 种子文件编写

```js
export async function seed(knex) {
  // 清空表
  await knex('table_name').del();

  // 插入数据
  await knex('table_name').insert([
    { name: 'Item 1', status: 1 },
    { name: 'Item 2', status: 1 }
  ]);
}
```

### 4.3 执行种子

```bash
# 开发环境
npm run seed

# 生产环境
npm run seed:prod
```

> **注意**：种子会先 `del()` 清空表再插入，注意执行顺序（被依赖的表先执行）。

---

## 5. 查询构建器

### 5.1 基本 CRUD

```js
const db = getDatabase();

// SELECT
const users = await db('users').where('status', 1);
const user  = await db('users').where('id', 1).first();
const names = await db('users').select('id', 'username', 'nickname');

// INSERT
const [id] = await db('users').insert({ username: 'test', password: 'xxx' });

// UPDATE
await db('users').where('id', 1).update({ nickname: 'New Name' });

// DELETE
await db('users').where('id', 1).del();
```

### 5.2 条件查询

```js
// WHERE
await db('users').where('status', 1);
await db('users').where('age', '>', 18);
await db('users').where({ status: 1, dept_id: 100 });

// WHERE IN
await db('users').whereIn('id', [1, 2, 3]);

// WHERE NULL / NOT NULL
await db('users').whereNull('deleted_at');
await db('users').whereNotNull('email');

// WHERE LIKE
await db('users').whereLike('username', '%admin%');

// OR 条件
await db('users').where('status', 1).orWhere('role', 'admin');
```

### 5.3 排序与分页

```js
// 排序
await db('users').orderBy('created_at', 'desc');

// 分页
await db('users')
  .limit(10)      // 每页条数
  .offset(20);    // 跳过条数 = (page - 1) * limit

// 计数
const [{ count }] = await db('users').count('* as count');
```

### 5.4 JOIN

```js
// 内连接
await db('users as u')
  .join('depts as d', 'u.dept_id', 'd.id')
  .select('u.id', 'u.username', 'd.name as dept_name');

// 左连接
await db('users as u')
  .leftJoin('user_roles as ur', 'u.id', 'ur.user_id')
  .select('u.*', 'ur.role_id');

// 多表 JOIN
await db('user_roles as ur')
  .join('roles as r', 'ur.role_id', 'r.id')
  .join('users as u', 'ur.user_id', 'u.id')
  .where('u.id', userId)
  .select('r.id', 'r.name', 'r.code');
```

### 5.5 聚合与分组

```js
// 聚合
await db('orders').count('* as total');
await db('orders').sum('amount as total_amount');
await db('orders').avg('amount as avg_amount');
await db('orders').max('amount as max_amount');
await db('orders').min('amount as min_amount');

// 分组
await db('orders')
  .select('dept_id')
  .count('* as order_count')
  .groupBy('dept_id');
```

### 5.6 原始查询

```js
// 原始 SQL 表达式
await db.raw('SELECT * FROM users WHERE status = ?', [1]);

// 在查询中使用原始表达式
await db('users')
  .select('id', 'username', db.raw('DATE(created_at) as created_date'));
```

---

## 6. BaseModel 基类

所有 Model 继承自 `src/models/base.model.js` 中的 `BaseModel`，提供通用 CRUD 方法：

| 方法 | 说明 | 示例 |
|------|------|------|
| `findById(id)` | 按 ID 查询单条 | `await userModel.findById(1)` |
| `findOne(where)` | 按条件查询单条 | `await userModel.findOne({ username: 'admin' })` |
| `findAll(options)` | 分页查询 | `await userModel.findAll({ page: 1, limit: 10, where: { status: 1 } })` |
| `create(data)` | 创建记录 | `await userModel.create({ username: 'test' })` |
| `update(id, data)` | 更新记录 | `await userModel.update(1, { nickname: 'New' })` |
| `delete(id)` | 物理删除 | `await userModel.delete(1)` |
| `softDelete(id)` | 软删除（设置 deleted_at） | `await userModel.softDelete(1)` |
| `count(where)` | 计数 | `await userModel.count({ status: 1 })` |
| `exists(where)` | 是否存在 | `await userModel.exists({ username: 'admin' })` |
| `bulkInsert(dataArray)` | 批量插入 | `await userModel.bulkInsert([...])` |
| `bulkUpdate(ids, data)` | 批量更新 | `await userModel.bulkUpdate([1,2], { status: 0 })` |
| `transaction(callback)` | 事务 | 见下方事务章节 |

---

## 7. 自定义 Model 示例

### 7.1 基本结构

```js
import { BaseModel } from './base.model.js';
import { getDatabase } from '../config/database.js';

export class UserDepartmentModel extends BaseModel {
  constructor() {
    super('users');  // 传入表名
  }

  /**
   * 字段映射：前端 camelCase → 数据库 snake_case
   */
  toDbFormat(data) {
    const dbData = {};
    const fieldMap = {
      username: 'username',
      nickname: 'nickname',
      deptId: 'dept_id',
      status: 'status'
    };
    for (const [key, dbKey] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        dbData[dbKey] = data[key];
      }
    }
    return dbData;
  }

  /**
   * 格式化输出：数据库 snake_case → 前端 camelCase
   */
  formatUser(user) {
    return {
      id: user.id,
      username: user.username,
      deptId: user.dept_id,
      status: user.status,
      createdAt: user.created_at
    };
  }

  /**
   * 自定义查询：带过滤条件和分页
   */
  async getUsersWithFilters(filters = {}, page = 1, limit = 10) {
    let query = getDatabase()('users').whereNull('deleted_at');
    let countQuery = getDatabase()('users').whereNull('deleted_at');

    if (filters.username) {
      query = query.whereLike('username', `%${filters.username}%`);
      countQuery = countQuery.whereLike('username', `%${filters.username}%`);
    }
    if (filters.status !== undefined && filters.status !== '') {
      query = query.where('users.status', filters.status);
      countQuery = countQuery.where('status', filters.status);
    }

    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);
    const offset = (page - 1) * limit;
    const data = await query.orderBy('created_at', 'desc').limit(limit).offset(offset);

    return {
      list: data.map(u => this.formatUser(u)),
      total,
      pageSize: limit,
      currentPage: page
    };
  }
}
```

### 7.2 字段映射注意事项

- `toDbFormat()` 中用 `data[key] !== undefined` 判断，**不要用 truthy 检查**，否则 `status: 0` 会被跳过
- 密码等敏感字段不要放入 `toDbFormat`，在 `create()`/`update()` 中单独处理
- JSON 列（如 `role_ids`）在 `toDbFormat` 中用 `JSON.stringify()` 序列化，在 `formatXxx` 中用 `JSON.parse()` 反序列化

---

## 8. 事务处理

### 8.1 使用 BaseModel 的 transaction 方法

```js
const userModel = new UserModel();

await userModel.transaction(async (trx) => {
  // 在事务内执行操作，传入 trx 对象
  const user = await trx('users').where('id', userId).first();
  await trx('user_roles').where('user_id', userId).del();
  await trx('user_roles').insert(roleIds.map(rid => ({
    user_id: userId,
    role_id: rid
  })));
  // 如果回调抛出异常，事务自动回滚
  // 如果回调正常返回，事务自动提交
});
```

### 8.2 直接使用数据库实例的事务

```js
const db = getDatabase();

await db.transaction(async (trx) => {
  const [userId] = await trx('users').insert({
    username: 'newuser',
    password: 'hashed_password'
  });

  await trx('user_roles').insert({
    user_id: userId,
    role_id: 1
  });
});
```

---

## 9. 常用命令速查

| 命令 | 说明 |
|------|------|
| `npm run migrate` | 执行所有未执行的迁移 |
| `npm run migrate:prod` | 生产环境执行迁移 |
| `npm run migrate:rollback` | 回滚最近一批迁移 |
| `npm run seed` | 执行所有种子文件 |
| `npm run seed:prod` | 生产环境执行种子 |
| `npm run dev` | 启动开发服务器 |

### 数据库重置流程

```bash
# 1. 回滚所有迁移
npm run migrate:rollback

# 2. 重新执行迁移
npm run migrate

# 3. 填充种子数据
npm run seed
```

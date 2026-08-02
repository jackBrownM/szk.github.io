---
title: PostgreSQL 是什么
date: 2026-08-02 12:30:00
tags:
  - PostgreSQL
  - 数据库
categories:
  - server
---

## 一、PostgreSQL 是什么

一句话：**开源最强的关系型数据库**，比 MySQL 功能更丰富，支持复杂查询、JSON、全文搜索、地理信息等。

**核心特点**：

- 完全支持 SQL 标准
- 支持事务（ACID）
- 每个连接 = 一个进程（MySQL 是线程）
- 可以自定义数据类型、函数、索引方法
- 免费，社区活跃

---

## 二、安装后的第一件事

**三个配置文件**要知道：

| 文件 | 作用 | 一句话解释 |
| --- | --- | --- |
| postgresql.conf | 数据库主配置 | 内存、性能、日志都在这 |
| pg_hba.conf | 谁能连进来 | 控制 IP、用户、认证方式 |
| pg_ident.conf | 系统用户映射 | 很少改 |

**常用命令**：

```sql
psql -U postgres -d mydb    -- 连接数据库
\\l                           -- 列出所有数据库
\\dt                          -- 列出当前库所有表
\\d users                     -- 查看表结构
\\q                           -- 退出
```

---

## 三、数据库层级结构

```
实例（一个PG服务）
  └── 数据库（database）    -- 互相隔离，不能跨库查询
       └── 模式（schema）   -- 像文件夹，默认是 public
            └── 表、视图、函数...
```

简单理解：一个 PG 服务可以装多个数据库，每个数据库里有多个 schema，schema 里放表。

---

## 四、数据类型

### 数字

| 类型 | 用途 | 例子 |
| --- | --- | --- |
| integer | 一般整数 | 年龄、数量 |
| bigint | 大整数 | ID、订单号 |
| numeric(10,2) | 精确小数 | 金额（**钱必须用这个**） |
| real / double | 近似小数 | 科学计算 |
| serial | 自增ID | 主键 |

### 文字

| 类型 | 区别 |
| --- | --- |
| varchar(n) | 限制最大长度 |
| text | 不限长度，**推荐用这个** |
| char(n) | 固定长度，右边补空格，基本不用 |

> PG 中 text 和 varchar 性能一样，text 更省心。
> 

### 时间

| 类型 | 说明 |
| --- | --- |
| date | 只有日期：2024-06-15 |
| time | 只有时间：14:30:00 |
| timestamp | 日期+时间（不带时区） |
| timestamptz | 日期+时间+时区，**推荐用这个** |
| interval | 时间段：'3 days'、'2 hours' |

```sql
SELECT now();                        -- 当前时间
SELECT now() - interval '7 days';    -- 7天前
```

### 布尔

`boolean`：true / false / null，就这三个值。

### 数组

PG 原生支持数组，MySQL 不支持：

```sql
CREATE TABLE t (tags text[]);
INSERT INTO t VALUES ('{python, sql, redis}');
SELECT * FROM t WHERE 'python' = ANY(tags);  -- 包含python的
```

### JSON

```sql
CREATE TABLE t (data jsonb);   -- 用 jsonb，别用 json
INSERT INTO t VALUES ('{"name": "张三", "age": 25}');
SELECT data->>'name' FROM t;  -- 取值：张三
```

jsonb 比 json 快，能建索引。

### UUID

```sql
SELECT gen_random_uuid();  -- 生成随机UUID，PG13+内置
```

### 枚举

```sql
CREATE TYPE status AS ENUM ('active', 'inactive', 'banned');
```

### 其他

- `inet`：IP 地址
- `bytea`：二进制数据
- `daterange/int4range`：范围类型（表示一个区间）

---

## 五、建表和约束

```sql
CREATE TABLE users (
    id         bigserial PRIMARY KEY,           -- 自增主键
    username   varchar(50) NOT NULL UNIQUE,      -- 非空+唯一
    email      text NOT NULL,
    age        integer CHECK (age >= 0),         -- 检查约束
    dept_id    integer REFERENCES departments(id), -- 外键
    created_at timestamptz DEFAULT now()         -- 默认值
);
```

**约束一览**：

| 约束 | 作用 | 记忆 |
| --- | --- | --- |
| PRIMARY KEY | 唯一标识每行 | 每表一个 |
| UNIQUE | 不能重复 | 允许多个NULL |
| NOT NULL | 不能为空 | — |
| CHECK | 自定义条件 | 如 age >= 0 |
| FOREIGN KEY | 关联其他表 | 保证数据完整 |
| DEFAULT | 不填时用默认值 | 如 now() |

---

## 六、增删改查（CRUD）

### 插入

```sql
-- 单行
INSERT INTO users (username, email) VALUES ('alice', 'a@b.com');

-- 多行
INSERT INTO users (username, email) VALUES ('bob', 'b@b.com'), ('carol', 'c@b.com');

-- 插入并返回
INSERT INTO users (username, email) VALUES ('dave', 'd@b.com') RETURNING id;

-- 有则更新，无则插入（UPSERT）
INSERT INTO users (username, email) VALUES ('alice', 'new@b.com')
    ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email;
```

### 查询

```sql
SELECT * FROM users WHERE age > 18 ORDER BY created_at DESC LIMIT 10;
```

### 更新

```sql
UPDATE users SET age = 26 WHERE username = 'alice';

-- 关联更新
UPDATE orders SET status = 'cancelled'
FROM users WHERE orders.user_id = users.id AND users.status = 0;
```

### 删除

```sql
DELETE FROM users WHERE status = 0;
TRUNCATE TABLE users;  -- 快速清空整张表
```

### 批量导入导出

```sql
COPY users TO '/tmp/users.csv' WITH CSV HEADER;    -- 导出
COPY users FROM '/tmp/users.csv' WITH CSV HEADER;  -- 导入
```

比一条条 INSERT 快几十倍。

---

## 七、JOIN 连表查询

```sql
-- 内连接：两表都有的
SELECT u.name, d.dept_name
FROM users u JOIN departments d ON u.dept_id = d.id;

-- 左连接：左表全保留，右表没有的填NULL
SELECT u.name, o.amount
FROM users u LEFT JOIN orders o ON u.id = o.user_id;

-- 右连接：和左连接反过来
-- 全连接：两边都保留
SELECT * FROM a FULL JOIN b ON a.id = b.a_id;
```

**记忆口诀**：内连交集，左连保左，右连保右，全连保全。

---

## 八、子查询

```sql
-- IN：在不在列表里
SELECT * FROM users WHERE id IN (SELECT user_id FROM vip);

-- EXISTS：存不存在（通常比IN快）
SELECT * FROM users u WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);

-- 标量子查询：返回单个值
SELECT name, (SELECT count(*) FROM orders WHERE user_id = users.id) AS cnt FROM users;
```

---

## 九、聚合与分组

```sql
SELECT department, count(*) AS 人数, avg(salary) AS 平均工资
FROM employees
GROUP BY department
HAVING avg(salary) > 10000;  -- HAVING筛选分组后的结果
```

| 函数 | 作用 |
| --- | --- |
| count(*) | 计数 |
| sum(col) | 求和 |
| avg(col) | 平均 |
| max(col) / min(col) | 最大/最小 |
| string_agg(col, ',') | 拼接字符串 |
| array_agg(col) | 聚合成数组 |

---

## 十、窗口函数

不分组，但能在每行上做计算，非常实用：

```sql
SELECT name, department, salary,
    rank() OVER (PARTITION BY department ORDER BY salary DESC) AS 部门排名
FROM employees;
```

| 函数 | 作用 | 例子 |
| --- | --- | --- |
| row_number() | 行号，不重复 | 1,2,3,4 |
| rank() | 排名，并列跳号 | 1,1,3,4 |
| dense_rank() | 排名，并列不跳 | 1,1,2,3 |
| lag(col, 1) | 前一行的值 | 环比计算 |
| lead(col, 1) | 后一行的值 | — |
| sum() OVER() | 累计求和 | 流水账累计 |
| ntile(4) | 分成4组 | 分位数 |

---

## 十一、CTE 和递归查询

### CTE（临时结果集）

把复杂查询拆成几步，可读性好：

```sql
WITH vip_users AS (
    SELECT user_id FROM orders GROUP BY user_id HAVING sum(amount) > 10000
)
SELECT * FROM users WHERE id IN (SELECT user_id FROM vip_users);
```

### 递归（查树形结构）

```sql
-- 员工→上级→上级的上级...
WITH RECURSIVE tree AS (
    SELECT id, name, parent_id, 1 AS level FROM employees WHERE parent_id IS NULL
    UNION ALL
    SELECT e.id, e.name, e.parent_id, t.level + 1
    FROM employees e JOIN tree t ON e.parent_id = t.id
)
SELECT * FROM tree;
```

典型场景：组织架构、菜单树、评论楼中楼。

---

## 十二、索引

### 为什么要索引

没索引 = 翻整本书找一个字。有索引 = 直接看目录翻到那一页。

### 索引类型

| 类型 | 什么时候用 | 记忆 |
| --- | --- | --- |
| B-tree | 等于、大于小于、排序（**默认**） | 万能选手 |
| Hash | 只有等于 | 很少用 |
| GIN | 数组、JSONB、全文搜索 | 多值查询 |
| GiST | 地理、范围、最近邻 | 空间类 |
| BRIN | 时间序列大表 | 体积极小 |

### 怎么建

```sql
-- 普通索引
CREATE INDEX idx_email ON users (email);

-- 唯一索引
CREATE UNIQUE INDEX idx_username ON users (username);

-- 复合索引（注意列顺序，最常查的放前面）
CREATE INDEX idx_user_date ON orders (user_id, created_at);

-- 部分索引（只索引一部分数据，省空间）
CREATE INDEX idx_active ON users (email) WHERE status = 1;

-- JSONB索引
CREATE INDEX idx_data ON events USING GIN (data);

-- 不锁表建索引（生产环境必须用）
CREATE INDEX CONCURRENTLY idx_xxx ON table (col);
```

### 索引原则

- **查询多、写入少**的列适合建索引
- **小表不需要**索引
- 复合索引遵循**最左前缀**（先匹配第一列）
- 定期清理**未使用的索引**（浪费空间和写入性能）

---

## 十三、事务

### 基本用法

```sql
BEGIN;                    -- 开始事务
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;                   -- 提交（全部生效）
-- 或 ROLLBACK;           -- 回滚（全部撤销）
```

### 保存点

```sql
BEGIN;
INSERT INTO t VALUES (1);
SAVEPOINT sp1;
INSERT INTO t VALUES (2);   -- 这步出错了
ROLLBACK TO sp1;             -- 回到保存点，只撤销这步
INSERT INTO t VALUES (3);
COMMIT;                      -- 1和3成功
```

### 隔离级别

| 级别 | 解释 | PG默认 |
| --- | --- | --- |
| Read Committed | 每条SQL看到的是执行那一刻的数据 | ✅ |
| Repeatable Read | 整个事务看到的是事务开始时的快照 |  |
| Serializable | 完全串行，最严格 |  |

大多数场景用默认就够了。

### MVCC（简单理解）

- PG 不会直接修改旧数据，而是**写一个新版本**
- 旧版本保留着给其他正在读的事务用
- 所以**读不阻塞写，写不阻塞读**
- 旧版本最终靠 VACUUM 清理

---

## 十四、锁

### 行锁

```sql
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;        -- 锁住这行，别人不能改
SELECT * FROM accounts WHERE id = 1 FOR SHARE;         -- 锁住但允许别人也读锁
SELECT * FROM accounts WHERE id = 1 FOR UPDATE NOWAIT; -- 锁不到就立刻报错
SELECT * FROM accounts WHERE id = 1 FOR UPDATE SKIP LOCKED; -- 锁不到就跳过
```

`SKIP LOCKED` 很实用：做任务队列时，多个 worker 各取各的任务。

### 死锁

两个事务互相等对方释放锁 → PG 自动检测到后杀掉一个。

**避免**：按固定顺序操作数据。

---

## 十五、VACUUM（清理）

### 为什么需要

PG 更新/删除不会真的删数据，只是标记"死了"。时间久了**死数据越来越多，表越来越大**。

### 怎么用

```sql
VACUUM users;            -- 标记空间可复用（不缩表）
VACUUM FULL users;       -- 真正缩表（会锁表！生产慎用）
VACUUM ANALYZE users;    -- 清理 + 更新统计信息
```

### 自动清理

PG 有 **autovacuum**，默认开启，自动清理。一般不用手动操作，但要确认它在正常工作：

```sql
SELECT relname, n_dead_tup, last_autovacuum FROM pg_stat_user_tables;
```

---

## 十六、函数和存储过程

### 函数（有返回值）

```sql
CREATE FUNCTION get_age(birth date) RETURNS integer AS $$
BEGIN
    RETURN extract(year FROM age(birth))::integer;
END;
$$ LANGUAGE plpgsql;

SELECT get_age('1990-05-15');  -- 36
```

### 存储过程（PG11+，无返回值，可以中途提交事务）

```sql
CREATE PROCEDURE clean_old_data() LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM logs WHERE created_at < now() - interval '90 days';
    COMMIT;
END;
$$;

CALL clean_old_data();
```

**区别**：函数用 SELECT 调用有返回值；过程用 CALL 调用，能在中间 COMMIT。

---

## 十七、触发器

当表发生增删改时**自动执行**一段逻辑：

```sql
-- 1. 写触发器函数
CREATE FUNCTION set_update_time() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. 绑到表上
CREATE TRIGGER trg_update_time
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_update_time();
```

现在每次 UPDATE users，updated_at 自动更新。

---

## 十八、视图

### 普通视图（虚拟表，每次查询时执行）

```sql
CREATE VIEW active_users AS
SELECT * FROM users WHERE status = 1;

SELECT * FROM active_users;  -- 等于执行上面的SQL
```

### 物化视图（结果缓存到磁盘，需要手动刷新）

```sql
CREATE MATERIALIZED VIEW mv_report AS
SELECT date_trunc('month', created_at) AS month, sum(amount)
FROM orders GROUP BY 1;

REFRESH MATERIALIZED VIEW mv_report;  -- 手动刷新数据
```

适合：**算一次很慢、数据不频繁变化**的报表。

---

## 十九、分区表

大表按规则拆成小表，查询自动只扫相关分区：

### 按时间范围分区（最常用）

```sql
CREATE TABLE orders (id bigserial, created_at timestamptz, amount numeric)
PARTITION BY RANGE (created_at);

CREATE TABLE orders_2024_q1 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
CREATE TABLE orders_2024_q2 PARTITION OF orders
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');
```

查 `WHERE created_at = '2024-02-01'` 时只扫 q1 分区，不碰 q2。

### 按值列表分区

```sql
PARTITION BY LIST (country);
-- CN 一个分区，US 一个分区
```

### 按哈希分区

```sql
PARTITION BY HASH (user_id);
-- 均匀分散数据
```

**什么时候分区**：表超过几千万行、按时间查询多、需要快速归档旧数据。

---

## 二十、全文搜索

PG 内置全文搜索，不用装 ES 也能搜：

```sql
-- 基本搜索
SELECT * FROM articles
WHERE to_tsvector('english', title) @@ to_tsquery('english', 'database & fast');

-- 加索引提速
CREATE INDEX idx_search ON articles USING GIN (to_tsvector('english', title));
```

中文需要装插件（zhparser / pg_jieba）。

---

## 二十一、JSONB 操作

```sql
CREATE TABLE events (id serial, data jsonb);
INSERT INTO events (data) VALUES ('{"type":"click","page":"/home"}');

-- 取值
SELECT data->>'type' FROM events;             -- click（文本）
SELECT data->'nested'->'key' FROM events;     -- 嵌套取值

-- 查询
SELECT * FROM events WHERE data @> '{"type":"click"}';   -- 包含匹配
SELECT * FROM events WHERE data ? 'type';                -- 有这个key吗

-- 修改
UPDATE events SET data = data || '{"source":"web"}';     -- 加字段
UPDATE events SET data = data - 'source';                -- 删字段

-- 索引（让JSONB查询快起来）
CREATE INDEX idx_data ON events USING GIN (data);
```

---

## 二十二、权限管理

```sql
-- 创建用户
CREATE ROLE app_user LOGIN PASSWORD 'xxx';

-- 给权限
GRANT CONNECT ON DATABASE mydb TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;

-- 收回权限
REVOKE DELETE ON users FROM app_user;

-- 行级安全（用户只能看自己的数据）
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_orders ON orders USING (user_id = current_user_id());
```

**原则**：最小权限，生产环境**永远别用 superuser** 跑应用。

---

## 二十三、备份与恢复

### 逻辑备份（小中型库）

```bash
pg_dump mydb > backup.sql                   # 备份
psql mydb < backup.sql                      # 恢复
pg_dump -Fc mydb > backup.dump              # 压缩格式
pg_restore -d mydb -j 4 backup.dump         # 并行恢复
```

### 物理备份（大型库，支持恢复到任意时间点）

```bash
pg_basebackup -D /backup -Ft -z -P          # 基础备份
# 配合 WAL 归档 → 可以恢复到任意秒
```

### 记忆

| 库大小 | 方案 |
| --- | --- |
| < 10GB | pg_dump |
| 10-500GB | pg_basebackup + WAL 归档 |
| > 500GB | pgBackRest / Barman |

---

## 二十四、主从复制

### 流复制（物理复制）

主库写 → WAL 日志同步到从库 → 从库重放。

```bash
# 从库一键搭建
pg_basebackup -h 主库IP -D /data -R -P
```

- 从库**只读**
- 数据完全一致
- 可配置同步/异步

### 逻辑复制

按表级别复制，更灵活：

```sql
-- 主库
CREATE PUBLICATION my_pub FOR TABLE users, orders;
-- 从库
CREATE SUBSCRIPTION my_sub CONNECTION 'host=主库' PUBLICATION my_pub;
```

**区别**：流复制是整个库完全复制；逻辑复制可以选表，可以跨版本。

---

## 二十五、高可用

| 方案 | 一句话 |
| --- | --- |
| Patroni + etcd | 最流行，自动故障转移 |
| PgBouncer | 连接池，减少连接数 |
| HAProxy | 负载均衡，读写分离 |

生产标配：**PgBouncer + Patroni + 流复制**。

---

## 二十六、性能优化

### EXPLAIN 看执行计划

```sql
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'a@b.com';
```

关注：

- `Seq Scan` = 全表扫描（慢）→ 考虑加索引
- `Index Scan` = 用了索引（好）
- `actual rows` vs 估计差太多 → 跑一下 `ANALYZE` 更新统计

### 关键配置（改这几个就够80%场景）

| 参数 | 设多少 | 作用 |
| --- | --- | --- |
| shared_buffers | 内存的 25% | 数据缓存 |
| effective_cache_size | 内存的 75% | 告诉优化器有多少缓存 |
| work_mem | 64-256MB | 排序/Hash用的内存 |
| maintenance_work_mem | 512MB-1GB | 建索引/VACUUM用的内存 |
| max_connections | 100-300 | 最大连接数（配合连接池） |

### 优化速查表

| 问题 | 解决 |
| --- | --- |
| 查询慢 | EXPLAIN → 加索引 |
| 表太大 | 分区 |
| 连接数不够 | PgBouncer 连接池 |
| 统计不准 | ANALYZE |
| 死元组多 | 检查 autovacuum |
| 分页慢（OFFSET大） | 改用 `WHERE id > 上一页最后ID` |
| SELECT * | 只查需要的列 |
| 批量插入慢 | 用 COPY 替代 INSERT |

---

## 二十七、运维监控

### 常用查询

```sql
-- 当前谁在干什么
SELECT pid, usename, state, query FROM pg_stat_activity WHERE state = 'active';

-- 表大小排行
SELECT relname, pg_size_pretty(pg_total_relation_size(oid)) AS size
FROM pg_class WHERE relkind = 'r' ORDER BY pg_total_relation_size(oid) DESC LIMIT 10;

-- 缓存命中率（低于99%要加内存）
SELECT sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) FROM pg_statio_user_tables;

-- 没人用的索引（可以删掉）
SELECT indexrelname, idx_scan FROM pg_stat_user_indexes WHERE idx_scan = 0;

-- 杀掉慢查询
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
WHERE state = 'active' AND query_start < now() - interval '5 minutes';
```

### 必装扩展

```sql
CREATE EXTENSION pg_stat_statements;  -- 记录所有SQL的统计信息
-- 查最慢的SQL
SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
```

---

## 二十八、常用扩展

| 扩展 | 干什么 | 场景 |
| --- | --- | --- |
| pg_stat_statements | SQL统计 | 找慢查询 |
| PostGIS | 地理空间 | 地图、附近的人 |
| pgvector | 向量搜索 | AI / RAG |
| pg_trgm | 模糊匹配 | 搜索建议 |
| uuid-ossp | 生成UUID | 分布式ID |
| pg_cron | 定时任务 | 定时清理 |
| pg_repack | 在线整理表 | 不锁表缩表 |
import { Category, MerchantRule } from '../types/transaction';
import { SqlExecutor } from './database';

export function createCategoryRepository(db: SqlExecutor) {
  return {
    async getAll(): Promise<Category[]> {
      const rows = await db.query('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
      return rows.map(r => ({
        id: String(r.id),
        name: String(r.name),
        icon: String(r.icon),
        color: String(r.color),
        isSystem: Number(r.is_system) === 1,
        sortOrder: Number(r.sort_order),
      }));
    },

    async add(c: Category): Promise<void> {
      await db.run(
        'INSERT INTO categories (id, name, icon, color, is_system, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [c.id, c.name, c.icon, c.color, c.isSystem ? 1 : 0, c.sortOrder],
      );
    },

    async remove(id: string): Promise<void> {
      await db.run('DELETE FROM categories WHERE id = ? AND is_system = 0', [id]);
    },

    async getRules(): Promise<MerchantRule[]> {
      const rows = await db.query('SELECT * FROM merchant_rules ORDER BY created_at DESC');
      return rows.map(r => ({
        id: String(r.id),
        pattern: String(r.pattern),
        category: String(r.category),
        createdAt: Number(r.created_at),
      }));
    },

    async upsertRule(rule: MerchantRule): Promise<void> {
      await db.run(
        `INSERT INTO merchant_rules (id, pattern, category, created_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(pattern) DO UPDATE SET category = excluded.category`,
        [rule.id, rule.pattern, rule.category, rule.createdAt],
      );
    },

    async removeRule(id: string): Promise<void> {
      await db.run('DELETE FROM merchant_rules WHERE id = ?', [id]);
    },

    async removeRulesForCategory(category: string): Promise<void> {
      await db.run('DELETE FROM merchant_rules WHERE category = ?', [category]);
    },
  };
}

export type CategoryRepository = ReturnType<typeof createCategoryRepository>;

import { Router } from 'express';
import db from '../db.js';
import { signAdmin, signProduct } from '../auth.js';
import { verifyPassword } from '../crypto.js';

const router = Router();

// 后台管理登录
router.post('/admin-login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) { res.status(400).json({ error: '请输入账号和密码' }); return; }
  const acc = db.prepare('SELECT * FROM admin_accounts WHERE username = ? AND is_active = 1').get(username) as any;
  if (!acc || !verifyPassword(password, acc.password)) {
    res.status(401).json({ error: '账号或密码错误' }); return;
  }
  const token = signAdmin(acc.username, acc.role);
  res.json({ token, role: acc.role, username: acc.username });
});

// 产品访问登录
router.post('/product-login', (req, res) => {
  const { productId, password } = req.body;
  if (!productId || !password) { res.status(400).json({ error: '请选择产品并输入密码' }); return; }
  const pl = db.prepare('SELECT * FROM product_lines WHERE id = ? AND is_active = 1').get(productId) as any;
  if (!pl) { res.status(404).json({ error: '产品不存在' }); return; }

  let role: 'read' | 'entry' | 'config' | null = null;
  if (pl.pwd_config && verifyPassword(password, pl.pwd_config)) role = 'config';
  else if (pl.pwd_entry && verifyPassword(password, pl.pwd_entry)) role = 'entry';
  else if (pl.pwd_read && verifyPassword(password, pl.pwd_read)) role = 'read';

  if (!role) { res.status(401).json({ error: '密码错误' }); return; }
  const token = signProduct(pl.id, role, pl.name);
  res.json({ token, role, product: { id: pl.id, name: pl.name } });
});

export default router;

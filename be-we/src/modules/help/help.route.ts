import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { helpAskLimiter, helpArticleLimiter } from '../../middleware/rateLimiter';
import {
  askSchema,
  createHelpArticleSchema,
  updateHelpArticleSchema,
  helpArticleIdParamSchema,
  listHelpArticlesSchema,
  publicArticlesSchema,
} from './help.validator';
import {
  getPublicArticles,
  getPublicArticleById,
  ask,
  listArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
} from './help.controller';

const helpRoute = Router();

// --- Alamat publik: bisa diakses siapa saja, tanpa perlu token ---
helpRoute.get('/articles', helpArticleLimiter, validate(publicArticlesSchema), getPublicArticles);

helpRoute.get('/articles/:id', helpArticleLimiter, validate(helpArticleIdParamSchema), getPublicArticleById);

helpRoute.post('/ask', helpAskLimiter, validate(askSchema), ask);

// --- Alamat admin: wajib membawa token yang sah dan berperan sebagai admin ---
// Setiap baris di bawah, urutan prosesnya dari kiri ke kanan: pertama
// dibatasi jumlah requestnya, lalu diperiksa tokennya (authenticate),
// lalu diperiksa perannya (authorize), lalu divalidasi datanya, baru
// terakhir diproses oleh fungsi controller yang sesuai.
helpRoute.get(
  '/admin/articles',
  authenticate,
  authorize('admin'),
  validate(listHelpArticlesSchema),
  listArticles,
);

helpRoute.get(
  '/admin/articles/:id',
  authenticate,
  authorize('admin'),
  validate(helpArticleIdParamSchema),
  getArticle,
);

helpRoute.post(
  '/admin/articles',
  authenticate,
  authorize('admin'),
  validate(createHelpArticleSchema),
  createArticle,
);

helpRoute.put(
  '/admin/articles/:id',
  authenticate,
  authorize('admin'),
  validate(updateHelpArticleSchema),
  updateArticle,
);

helpRoute.delete(
  '/admin/articles/:id',
  authenticate,
  authorize('admin'),
  validate(helpArticleIdParamSchema),
  deleteArticle,
);

export default helpRoute;

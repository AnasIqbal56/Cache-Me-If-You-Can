import { Router } from 'express';
import { 
    createSellerStripeAccount,
    getSellerStripeStatus
} from '../controllers/seller.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';

const router = Router();

router.use(verifyJWT); // All routes require authentication
router.use(authorizeRoles); // All routes require seller role

router.post('/stripe/account', createSellerStripeAccount);
router.get('/stripe/status', getSellerStripeStatus);

export default router;
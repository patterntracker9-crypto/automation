import express from 'express';
import {
  ajio_picklist,
  fullFill,
  picklist,
} from '../../controllers/picklist/picklist.controller.js';
const router = express.Router();

router.post('/fullfill', fullFill);
router.post('/ajio', ajio_picklist);
router.post('/generate', picklist);

export default router;

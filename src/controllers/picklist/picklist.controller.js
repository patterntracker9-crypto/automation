import { generateAjioPicklist } from '../../services/picklist/ajioPicklist.service.js';
import { generateFullFillFile } from '../../services/picklist/downloadUnfullFillOrders.service.js';
import { generatePicklist } from '../../services/picklist/generatePicklist.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
const fullFill = asyncHandler(async (req, res) => {
  const { channel, user } = req.body;

  const result = await generateFullFillFile(channel, user);
  const filePath = result.fileData;
  return res.download(filePath, 'UpdateInStockQtyAnd_orLastPurchasePrice.csv');
});

const picklist = asyncHandler(async (req, res) => {
  const { channel } = req.body;
  const result = await generatePicklist(channel);
  const filePath = result.fileData;
  return res.download(filePath, `${channel}_picklist.pdf`);
});

const ajio_picklist = asyncHandler(async (req, res) => {
  const result = await generateAjioPicklist();
  const filePath = result.fileData;
  return res.download(filePath, `ajio_picklist.pdf`);
});

export { fullFill, picklist, ajio_picklist };

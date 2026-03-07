import { chromium } from 'playwright';
import { ApiError } from '../../utils/ApiError.js';
import path from 'path';
import AdmZip from 'adm-zip';
import fs from 'fs';
const generateFullFillFile = async (channel, user) => {
  const channels = {
    ajio: 'checkbox46180',
    myntra: 'checkbox46241',
    nykaa: 'checkbox47950',
    shopify: 'checkbox46242',
    tatacliq: 'checkbox46240',
    allchannel: 'filterOptionsSelectAll_channel_company_id',
  };
  if (!user) {
    throw new ApiError(400, 'User is required');
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  const email = process.env.EMAIL;
  const password = process.env.PASSWORD;

  // *******************************************************************************************
  //   ********************** PART 1 OMS UNFULLFILL ORDERS DOWNLOAD ***********************
  // *******************************************************************************************

  await page.goto('https://client.omsguru.com/');
  await page.getByPlaceholder('Email Address').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();

  await page.goto('https://client.omsguru.com/orders/unfulfillableOrders');
  await page.locator('#forceWarehouseSelector').selectOption('22784');

  await page.locator('[filter-field="channel_company_id"]').click();
  const popover = page.locator('#popoverchannel_company_id:visible');
  await popover.waitFor({ state: 'visible' });
  await popover.locator(`#${channels[channel?.trim().toLowerCase()]}`).click();
  await popover.locator('button.editable-submit').click();

  await Promise.all([
    page.waitForEvent('dialog').then((d) => d.accept()),
    page.locator('a[title="Export Orders"]').click(),
  ]);

  await page.locator('i.fa-bell').click();
  await page.waitForSelector('#ClientNotificationsList li.item');
  const exportLink = page
    .locator('#ClientNotificationsList li.item a[title="Click to download the exported orders"]')
    .first();

  const [download] = await Promise.all([page.waitForEvent('download'), exportLink.click()]);
  const zipPath = path.join(process.cwd(), await download.suggestedFilename());
  await download.saveAs(zipPath);

  //   ******************************************************************************************
  //   ************************************* ZIP EXTRACT + RENAME ****************************
  // *********************************************************************************************

  // folder path
  const extractPath = path.join(process.cwd(), 'src', 'picklistFiles', 'extracted_orders_info');

  // folder create if not exists
  if (!fs.existsSync(extractPath)) {
    fs.mkdirSync(extractPath, { recursive: true });
  }
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(extractPath, true);
  const extractedFiles = fs.readdirSync(extractPath);
  // find CSV file
  const csvFile = extractedFiles.find((file) => file.endsWith('.csv'));
  const finalFilePath = path.join(extractPath, 'orders_info.csv');
  if (fs.existsSync(finalFilePath)) fs.unlinkSync(finalFilePath);
  // rename csv
  fs.renameSync(path.join(extractPath, csvFile), finalFilePath);
  // delete zip
  fs.unlinkSync(zipPath);
  console.log('orders_info.csv ready at:', finalFilePath);

  // **********************************************************************************
  // ********************************** PART 2 RACKSPACE UPLOAD ********************
  // **********************************************************************************

  await page.goto('https://rackspaceupdater.netlify.app/');
  await page.locator('select').selectOption(user);
  await page.locator('input[type="file"]').setInputFiles(finalFilePath);
  const rackspaceFolder = path.join(process.cwd(), 'src', 'picklistFiles', 'rackspace');
  if (!fs.existsSync(rackspaceFolder)) fs.mkdirSync(rackspaceFolder);
  const [finalDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download Stock' }).click(),
  ]);
  const savePath = path.join(rackspaceFolder, 'UpdateInStockQtyAnd_orLastPurchasePrice.csv');
  await finalDownload.saveAs(savePath);
  console.log('Final stock file saved');
  await browser.close();

  return { success: true, fileData: savePath };
};

export { generateFullFillFile };

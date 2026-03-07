import { chromium } from 'playwright';
import { ApiError } from '../../utils/ApiError.js';
import path from 'path';
import AdmZip from 'adm-zip';
import fs from 'fs';
const generatePicklist = async (channel) => {
  const channels = {
    ajio: 'checkbox46180',
    myntra: 'checkbox46241',
    nykaa: 'checkbox47950',
    tatacliq: 'checkbox46240',
    allchannel: 'filterOptionsSelectAll_channel_company_id',
  };
  if (!channel) {
    throw new ApiError(400, 'channel is required');
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

  await page.goto('https://client.omsguru.com/orders/newOrders');
  await page.locator('#forceWarehouseSelector').selectOption('22784');

  await page.locator('[filter-field="channel_company_id"]').click();
  const popover = page.locator('#popoverchannel_company_id:visible');
  await popover.waitFor({ state: 'visible' });
  await popover.locator(`#${channels[channel?.trim().toLowerCase()]}`).click();
  await popover.locator('button.editable-submit').click();

  // ***********************************************************************************************
  // ***************************** PART 2 EXPORT PICKLIST ******************************************
  // ***********************************************************************************************

  const channelNameMapping = {
    myntra: 'Qurvii - Myntra PPMP',
    nykaa: 'Qurvii - Nykaa Fashion',
    ajio: 'Qurvii - Ajio Dropship',
    tatacliq: 'Qurvii - Tatacliq',
  };
  await page.goto('https://client.omsguru.com/picklists');
  // row jisme channel match kare
  const row = page.locator('tbody tr').filter({ hasText: channelNameMapping[channel] }).first();

  // View Picklist

  await row.locator('a[title="View picklist Details"]').click();
  const picklistDynamicFolder = path.join(process.cwd(), 'src', 'picklistFiles', `${channel}`);
  if (!fs.existsSync(picklistDynamicFolder)) fs.mkdirSync(picklistDynamicFolder);
  const [finalDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'CSV' }).click(),
  ]);

  const savePath = path.join(picklistDynamicFolder, `${channel}_picklist.csv`);
  await finalDownload.saveAs(savePath);
  console.log(`${channel} picklist downloaded`);

  // ***********************************************************************************************
  // ***************************** PART 3 EXPORT PACKLOG ******************************************
  // ***********************************************************************************************

  await page.goto('https://client.omsguru.com/invoice_pack_logs');
  const row2 = page.locator('tbody tr').filter({ hasText: channelNameMapping[channel] }).first();
  await row2.locator('a[title="View PackLog Details"]').click();

  page.on('dialog', async (dialog) => {
    console.log(dialog.message());
    await dialog.accept();
  });

  await page.getByRole('link', { name: 'Export Orders' }).click();

  await page.locator('i.fa-bell').click();
  await page.waitForSelector('#ClientNotificationsList li.item');
  const exportLink = page
    .locator('#ClientNotificationsList li.item a[title="Click to download the exported orders"]')
    .first();

  const [download] = await Promise.all([page.waitForEvent('download'), exportLink.click()]);
  const zipPath = path.join(process.cwd(), await download.suggestedFilename());
  await download.saveAs(zipPath);

  // folder path
  const extractPath = path.join(process.cwd(), 'src', 'picklistFiles', `${channel}`);

  // folder create if not exists
  if (!fs.existsSync(extractPath)) {
    fs.mkdirSync(extractPath, { recursive: true });
  }
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(extractPath, true);
  const extractedFiles = fs.readdirSync(extractPath);
  // find CSV file
  const csvFile = extractedFiles.find((file) => file.endsWith('.csv'));
  const finalFilePath = path.join(extractPath, `${channel}_orders_info.csv`);
  if (fs.existsSync(finalFilePath)) fs.unlinkSync(finalFilePath);
  // rename csv
  fs.renameSync(path.join(extractPath, csvFile), finalFilePath);
  // delete zip
  fs.unlinkSync(zipPath);
  console.log('orders_info.csv ready at:', finalFilePath);

  // ***********************************************************************************************
  // ***************************** PART 4 EXPORT RACK SPACE DETAILS ******************************************
  // ***********************************************************************************************

  await page.goto('https://client.omsguru.com/rack_spaces');
  await page.locator('#warehouseSelector').selectOption('22784');
  await page.getByRole('button', { name: 'Related Actions' }).click();

  // page.on('dialog', async (dialog) => {
  //   console.log(dialog.message());
  //   await dialog.accept();
  // });

  await page.getByRole('link', { name: 'Export Rack Details' }).click();
  await page.locator('i.fa-bell').click();
  await page.waitForSelector('#ClientNotificationsList li.item');
  const exportLink2 = page
    .locator(
      '#ClientNotificationsList li.item a[title="Click here to download the rack space inventory export file"]'
    )
    .first();

  const [download2] = await Promise.all([page.waitForEvent('download'), exportLink2.click()]);
  const zipPath2 = path.join(process.cwd(), await download2.suggestedFilename());
  await download.saveAs(zipPath2);

  const extractPath2 = path.join(process.cwd(), 'src', 'picklistFiles', 'rackspace');
  // folder create if not exists
  if (!fs.existsSync(extractPath2)) {
    fs.mkdirSync(extractPath2, { recursive: true });
  }
  const zip2 = new AdmZip(zipPath2);
  zip2.extractAllTo(extractPath2, true);
  const extractedFiles2 = fs.readdirSync(extractPath2);
  // find csv file
  const csvFile2 = extractedFiles2.find((file) => file.endsWith('.csv'));
  const finalFilePath2 = path.join(extractPath2, 'global_rack_space.csv');
  if (fs.existsSync(finalFilePath2)) fs.unlinkSync(finalFilePath2);
  // rename csv
  fs.renameSync(path.join(extractPath2, csvFile2), finalFilePath2);
  // delete zip
  fs.unlinkSync(zipPath2);
  console.log('global_rack_space.csv readty at: ', finalFilePath2);

  // ***********************************************************************************************
  // ***************************** PART 5 PICKLIST SYNCRONIZATION ******************************************
  // ***********************************************************************************************

  const orders_info_file_path = path.join(
    process.cwd(),
    'src',
    'picklistFiles',
    `${channel}`,
    `${channel}_orders_info.csv`
  );

  const picklist_file_path = path.join(
    process.cwd(),
    'src',
    'picklistFiles',
    `${channel}`,
    `${channel}_picklist.csv`
  );

  const global_rackspace_file_path = path.join(
    process.cwd(),
    'src',
    'picklistFiles',
    'rackspace',
    `global_rack_space.csv`
  );

  await page.goto('https://scanreturn3.netlify.app/uploads');
  const formattedChannel = channel.charAt(0).toUpperCase() + channel.slice(1).toLowerCase();
  await page.locator('select').selectOption(formattedChannel);
  await page.locator('#file-upload').setInputFiles(orders_info_file_path);
  // 1️⃣ Orders CSV
  await page.locator('#file-upload').setInputFiles(orders_info_file_path);
  await page.locator('#rack-space-upload').nth(0).setInputFiles(picklist_file_path);
  await page.locator('#rack-space-upload').nth(1).setInputFiles(global_rackspace_file_path);

  // sync orders
  await page.getByRole('button', { name: 'Sync Orders to NocoDB' }).click();
  const picklistPdfPath = path.join(
    process.cwd(),
    'src',
    'picklistFiles',
    'channelPdf',
    `${channel}_picklist.pdf`
  );
  const [download_picklist] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export Picklist' }).click(),
  ]);

  await download_picklist.saveAs(picklistPdfPath);
  await browser.close();
  return { fileData: picklistPdfPath };
};

export { generatePicklist };

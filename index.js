const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const csv = require('csv-writer').createObjectCsvWriter; 

chromium.use(StealthPlugin());

chromium.launch({headless: false}).then(async browser => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  // Go to main page
  console.log('goto the main page');
  await page.goto("https://shopee.com.my/mrdiy2u", { timeout: 120000 });
  
  // Occur click lang button event
  console.log('wait clicking lang button');
  await page.waitForSelector('button.shopee-button-outline.shopee-button-outline--primary-reverse');
  await page.locator('button.shopee-button-outline.shopee-button-outline--primary-reverse').nth(0).click();
  await page.waitForTimeout(2000);


  
  // Auto login
  await page.locator('input[name="loginKey"]').pressSequentially('Christinetan96', {delay: 100});
  await page.locator('input[name="password"]').pressSequentially('Qwe1234*', {delay: 100});
  await page.waitForTimeout(1000);
  await page.locator('button.wyhvVD._1EApiB.hq6WM5.L-VL8Q.cepDQ1._7w24N1').click();

  // Captcah and OTP
  console.log("verication...")
  await page.waitForTimeout(30000)
  await setXCenter(page);
  await page.waitForTimeout(30000)
  await setXCenter(page);


  // In main page, do scraping for full page.
  let data = [];
  for (let i = 0; i < 3; i++) {
    if (i != 0) {
      await page.locator("button.shopee-icon-button.shopee-icon-button--right").click();
      await page.waitForTimeout(5000);
    }
    else {
      await page.waitForTimeout(20000)
    }
    const dataPerpage = await scrappingFullPage(page);
    data = [...data, ...dataPerpage];
    await page.waitForTimeout(5000);
  }
  // Save the result to excel
  await saveAsCsv(data, 'full');

  // do scraping for detail page.
  console.log('goto the detail page');
  await page.goto("https://shopee.com.my/MILKON-3-ply-Disposable-Medical-Face-Mask-Black-(50-pieces)-i.38340310.20848008016?sp_atk=819dff74-2ddc-422c-aa24-7ffb4aeef777&xptdk=819dff74-2ddc-422c-aa24-7ffb4aeef777", { timeout: 120000 });
  await page.waitForTimeout(10000)
  await setXCenter(page);
	await page.waitForTimeout(10000)

  const detail_data = await scrapeDetailPage(page);
  await saveAsCsv(detail_data, 'detail');

  await page.waitForTimeout(5000);

  await context.close();
  // Turn off the browser once you finished
  await browser.close();  
});

async function mouseScrollAction(page) {
  await page.waitForTimeout(6000)
  
  console.log('step 1');
  const title1 = await page.locator('div.shop-page__all-products-section .shopee-sort-bar');
  await title1.scrollIntoViewIfNeeded();
  await page.waitForTimeout(6000)

  console.log('step 2');
  const title2 = await page.locator('div.shop-page__all-products-section .shopee-page-controller');
  await page.mouse.wheel(0, 600)
  await page.waitForTimeout(6000)

  console.log('step 3');
  const title3 = await page.locator('div.shop-page__all-products-section .shopee-page-controller');
  await title3.scrollIntoViewIfNeeded();
  await page.waitForTimeout(6000)
  
  console.log('step 4');
  const title4 = await page.locator('div.shop-page__all-products-section .shopee-page-controller');
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(6000);
}

async function scrappingFullPage(page) {
  await setXCenter(page);
  console.log("scrapping start...");
  const scraped_elements = [];
  console.log("getting items...");
  const items = await page.locator("div.shop-search-result-view__item.col-xs-2-4").all();

  await mouseScrollAction(page);

  console.log("starting picking item", items.length);
  // Pick the scraping item
  for (const item of items) {
    console.log("item-");
    const scraped_element = {};
    const image = await item.locator("img.HWfRmU.K-LtEw");
    scraped_element["img_link"] = await image.getAttribute("src", { timeout: 1000000 });
    console.log(scraped_element["img_link"]);
    
    const rate = await item.locator("div.Nv7uAa");
    if (await rate.isVisible()) {
      scraped_element["rate"] = await rate.innerText();
      console.log(scraped_element["rate"]);
    }
    const title = await item.locator("div.Od5Z3o._2sze40.XwV4kb");
    if (await title.isVisible()) {
      scraped_element["title"] = await title.innerText();
      console.log(scraped_element["title"]);
    }
    const price = await item.locator("div._4m2-Os.e5pdAI");
    if (await price.isVisible()) {
      scraped_element["price"] = await price.textContent();
      console.log(scraped_element["price"]);
    }
    const sold = await item.locator("div._2VNMCr");
    if (await sold.isVisible()) {
      scraped_element["sold"] = await sold.innerText();
      console.log(scraped_element["sold"]);
    }

    const seller = await item.locator("div.kK9iOM");
    if (await seller.isVisible()) {
      scraped_element["seller"] = await seller.innerText();
      console.log(scraped_element["seller"]);
    }

    scraped_elements.push(scraped_element);
  }

  console.log('finished scrapping..', scraped_elements.length);
  return scraped_elements;
}
async function scrapeDetailPage(page) {
  await setXCenter(page);

  const scraped_elements = {};
  const pictures = await page.locator("picture img").all();
  let picData = [];
  for (const picture of pictures) {
    picData.push(await picture.getAttribute("src", { timeout: 1000000 }));
  }
  scraped_elements['img'] = picData.join(',');
  scraped_elements['title'] = await page.locator('div._44qnta').textContent();
  scraped_elements['star'] = await page.locator('div._1k47d8._046PXf').innerText();
  scraped_elements['rating'] = await page.locator('._1k47d8').nth(1).innerText();
  scraped_elements['sold'] = await page.locator('div.flex.eaFIAE').textContent();
  scraped_elements['price'] = await page.locator('div.pqTWkA').innerText();

  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(3000);

  scraped_elements['description'] = await page.locator('div.f7AU53').textContent();
  console.log([scraped_elements]);

  console.log('finised scrapping detail page');
  return [scraped_elements];
}

async function saveAsCsv(data, type) {
  const header_full = [
    { id: 'img_link', title: 'img_link' },
    { id: 'rate', title: 'rate' },
    { id: 'title', title: 'title' },
    { id: 'price', title: 'price' },
    { id: 'sold', title: 'sold' },
    { id: 'seller', title: 'seller' },
  ];

  const header_detail = [
    { id: 'img', title: 'img' },
    { id: 'title', title: 'title' },
    { id: 'star', title: 'star' },
    { id: 'rating', title: 'rating' },
    { id: 'sold', title: 'sold' },
    { id: 'price', title: 'price' },
    { id: 'description', title: 'description' },
  ];

  const csvWriter = csv({
    path: 'scraped_data_' + type + '.csv',
    header: type == 'full' ? header_full : header_detail,
    quote: '"'
  });

  if (type != 'full') {
    console.log(data);
  }

  await csvWriter.writeRecords(data);
}

async function setXCenter(page) {
  const fullWidth = await page.evaluate(() => {
    return Math.max(
      document.body.scrollWidth,
      document.body.offsetWidth,
      document.documentElement.clientWidth,
      document.documentElement.scrollWidth,
      document.documentElement.offsetWidth
    );
  });

  let xPos = await page.evaluate(() => {
    return document.documentElement.scrollLeft;
  });

  
  xPos = xPos > Math.floor(fullWidth / 3) - 100 ? 0 : Math.floor(fullWidth / 3);   
  console.log(xPos);
  await page.mouse.wheel(xPos, 0);
}
import * as puppeteer from 'puppeteer';

const testAtMultipleResolutions = (testFn: (page: puppeteer.Page) => Promise<void> | void) => {
  return async () => {
    const resolutions = [
      {resolution: {width: 1920, height: 1080}, name: 'HD Desktop'},
      {resolution: {width: 3840, height: 2160}, name: 'UHD Desktop'},
      {resolution: {width: 320, height: 568}, name: 'iPhone 5 or SE'},
      {resolution: {width: 768, height: 1024}, name: 'iPad'},
      {resolution: {width: 411, height: 823}, name: 'Pixel 2XL'}
    ];

    await Promise.all(resolutions.map(async ({resolution, name}) => {
      const browser = await puppeteer.launch({});
      const page = await browser.newPage();
      page.setViewport(resolution);
      await testFn(page);
      await page.waitForTimeout(2000);
      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot({customSnapshotIdentifier: `${expect.getState().currentTestName}/${name}`});
      await page.close();
      browser.close();
    }));
  };
};

it('displays search page correctly', testAtMultipleResolutions(async (page) => {
  await page.goto(`file://${__dirname}/../out/index.html`);
  await page.waitForNetworkIdle();
}), 20000);
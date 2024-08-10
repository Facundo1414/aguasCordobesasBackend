import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as puppeteer from 'puppeteer';
import * as path from 'path';

@Injectable()
export class ScrapingService {
  constructor(@InjectQueue('scraping') private readonly scrapingQueue: Queue) {}

  async scrape(searchValue: string): Promise<string> {

    if (typeof searchValue !== 'string') {
      throw new Error('searchValue must be a string');
    }
    

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    });

    const page = await browser.newPage();
    await page.goto('https://www.aguascordobesas.com.ar/espacioClientes/seccion/gestionDeuda', { waitUntil: 'networkidle2' });

    await page.waitForSelector('#searchUf', { timeout: 10000 });
    await page.type('#searchUf', searchValue);
    await page.click("#btn-searchUf");

    await new Promise(resolve => setTimeout(resolve, 5000));
    await page.waitForSelector('#gd-ufCliente', { timeout: 10000 });

    const clienteName = await page.$eval('#gd-ufCliente', el => el.textContent);

    const isChecked = await page.evaluate(() => {
      const checkbox = document.querySelector<HTMLInputElement>('#includeVencidos');
      return checkbox ? checkbox.checked : false;
    });
 
    if (!isChecked) {
      await page.evaluate(() => {
        const checkbox = document.querySelector<HTMLInputElement>('#includeVencidos');
        if (checkbox) checkbox.scrollIntoView();
      });
      await page.waitForSelector('#includeVencidos', { visible: true });
      await page.click('#includeVencidos');
    }

    await page.waitForSelector("#btn-pagoDeudaEf", { visible: true });
    await page.click("#btn-pagoDeudaEf");

    await page.waitForSelector("#selVencimiento", { visible: true });
    await page.click("#selVencimiento");

    await page.evaluate(() => {
      const selectElement = document.querySelector<HTMLSelectElement>('#selVencimiento');
      if (selectElement) {
        const options = selectElement.querySelectorAll<HTMLOptionElement>('option');
        if (options.length > 1) {
          selectElement.value = options[1].value;
          selectElement.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    await page.waitForSelector("#btn-generarDocRweb", { visible: true });
    await page.click("#btn-generarDocRweb");

    await new Promise(resolve => setTimeout(resolve, 10000));

    // Define a valid download path or check download handling
    const downloadsPath = path.join(__dirname, '..', 'downloads');
    const pdfPath = path.join(downloadsPath, `${searchValue}.pdf`);

    await browser.close();
    return pdfPath;
  }

  async addToQueue(searchValue: string): Promise<void> {
    await this.scrapingQueue.add({ searchValue });
  }
}

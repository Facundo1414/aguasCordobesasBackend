import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class ScrapingService {
  constructor(
    @InjectQueue('scraping') private readonly scrapingQueue: Queue,
    private readonly httpService: HttpService
  ) {}

  async scrape(searchValue: string): Promise<string> {
    function delay(ms: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    });

    const page = await browser.newPage();
    const downloadsPath = path.join(__dirname, '..', 'downloads');
    if (!fs.existsSync(downloadsPath)) {
      fs.mkdirSync(downloadsPath, { recursive: true });
    }

    await page.goto('https://www.aguascordobesas.com.ar/espacioClientes/seccion/gestionDeuda', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#searchUf', { timeout: 10000 });
    await page.type('#searchUf', searchValue);
    await page.click("#btn-searchUf");


    // const isChecked = await page.evaluate(() => {
    //   const checkbox = document.querySelector<HTMLInputElement>('#includeVencidos');
    //   return checkbox ? checkbox.checked : false;
    // });

    // if (!isChecked) {
    //   await page.evaluate(() => {
    //     const checkbox = document.querySelector<HTMLInputElement>('#includeVencidos');
    //     const overlay = document.querySelector<HTMLElement>('#btn-showInfoSelAllVenc');
    //     if (checkbox) {
    //       checkbox.style.pointerEvents = 'auto';
    //       checkbox.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    //     }
    //     if (overlay) {
    //       overlay.style.display = 'none';
    //     }
    //   });

    //   await page.waitForSelector('#includeVencidos', { visible: true });
    //   await page.click('#includeVencidos');
    // }

    await page.waitForSelector("#btn-pagoDeudaEf", { visible: true });
    await page.click("#btn-pagoDeudaEf");
    await delay(2000);

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

    await page.waitForFunction(() => {
      const button = document.querySelector('#btn-generarDocRweb') as HTMLButtonElement | null;
      return button !== null && !button.disabled && button.offsetParent !== null && getComputedStyle(button).visibility !== 'hidden';
    }, { timeout: 20000 });

    await page.evaluate(() => {
      const button = document.querySelector('#btn-generarDocRweb') as HTMLButtonElement | null;
      if (button) {
        button.focus();
        button.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    });

    await page.screenshot({ path: 'before-click.png', fullPage: true });

    await page.click('#btn-generarDocRweb');

    const downloadUrl = await page.waitForResponse(response => {
      return response.url().includes('downloadDocDeuda') && response.status() === 200;
    }, { timeout: 30000 });

    if (downloadUrl) {
      const pdfUrl = downloadUrl.url();
      try {
        const { data } = await lastValueFrom(this.httpService.get(pdfUrl, { responseType: 'arraybuffer' }));
        const pdfPath = path.join(downloadsPath, `${searchValue}.pdf`);
        fs.writeFileSync(pdfPath, data);
        console.log('PDF downloaded:', pdfPath);
      } catch (err) {
        console.error('Error saving PDF:', err);
      }
    } else {
      console.error('Failed to find download URL.');
    }

    await browser.close();
    return path.join(downloadsPath, `${searchValue}.pdf`);
  }

  async addToQueue(searchValue: string): Promise<void> {
    await this.scrapingQueue.add({ searchValue });
  }
}

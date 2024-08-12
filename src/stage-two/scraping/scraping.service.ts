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

  private async createDownloadsDir(): Promise<string> {
    const downloadsPath = path.join(__dirname, '..', 'downloads');
    try {
      if (!fs.existsSync(downloadsPath)) {
        fs.mkdirSync(downloadsPath, { recursive: true });
      }
      return downloadsPath;
    } catch (error) {
      console.error('Error creating downloads directory:', error);
      throw new Error('Failed to create downloads directory');
    }
  }

  async scrape(searchValue: string): Promise<string> {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    let browser: puppeteer.Browser | null = null;

    try {
      browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
      });

      const page = await browser.newPage();
      const downloadsPath = await this.createDownloadsDir();

      await page.goto('https://www.aguascordobesas.com.ar/espacioClientes/seccion/gestionDeuda', { waitUntil: 'networkidle2' });
      await page.waitForSelector('#searchUf', { timeout: 10000 });
      await page.type('#searchUf', searchValue);
      await page.click('#btn-searchUf');

      await page.waitForSelector('#btn-pagoDeudaEf', { visible: true });
      await page.click('#btn-pagoDeudaEf');
      await delay(2000);

      await page.waitForSelector('#selVencimiento', { visible: true });
      await page.click('#selVencimiento');

      await page.evaluate(() => {
        const selectElement = document.querySelector<HTMLSelectElement>('#selVencimiento');
        if (selectElement && selectElement.options.length > 1) {
          selectElement.value = selectElement.options[1].value;
          selectElement.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      await page.waitForFunction(() => {
        const button = document.querySelector<HTMLButtonElement>('#btn-generarDocRweb');
        return button && !button.disabled && getComputedStyle(button).visibility !== 'hidden';
      }, { timeout: 20000 });

      await page.click('#btn-generarDocRweb');

      const downloadUrl = await page.waitForResponse(response => {
        return response.url().includes('downloadDocDeuda') && response.status() === 200;
      }, { timeout: 30000 });

      if (downloadUrl) {
        const pdfUrl = downloadUrl.url();
        const pdfPath = path.join(downloadsPath, `${searchValue}.pdf`);
        const { data } = await lastValueFrom(this.httpService.get(pdfUrl, { responseType: 'arraybuffer' }));
        fs.writeFileSync(pdfPath, data);
        console.log('PDF downloaded:', pdfPath);
        return pdfPath;
      } else {
        console.error('Failed to find download URL.');
        throw new Error('Failed to find download URL');
      }
    } catch (error) {
      console.error('Scraping error:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async addToQueue(searchValue: string): Promise<void> {
    await this.scrapingQueue.add({ searchValue });
  }
}

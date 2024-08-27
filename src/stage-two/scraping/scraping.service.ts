import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { Cluster } from 'puppeteer-cluster';

@Injectable()
export class ScrapingService implements OnModuleDestroy {
  private cluster: Cluster<any, any>;

  constructor(
    @InjectQueue('scraping') private readonly scrapingQueue: Queue,
    private readonly httpService: HttpService
  ) {
    this.initCluster();
  }

  private async initCluster() {
    this.cluster = await Cluster.launch({
      concurrency: Cluster.CONCURRENCY_CONTEXT,
      maxConcurrency: 6, // Define cuántas tareas quieres ejecutar en paralelo
      timeout: 60000, // Aumentar el timeout a 60 segundos
      retryLimit: 3, // Reintentar hasta 3 veces si un trabajo falla
      puppeteerOptions: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
      },
      monitor: true, // Habilita el monitor para ver el progreso en tiempo real
    });

    // Define la tarea que ejecutará cada worker en paralelo
    await this.cluster.task(async ({ page, data: { searchValue } }) => {
      const downloadsPath = await this.createDownloadsDir();
      console.log(`Processing search value: ${searchValue}`);

      try {
        await page.goto('https://www.aguascordobesas.com.ar/espacioClientes/seccion/gestionDeuda', { waitUntil: 'networkidle2' });

        await page.waitForSelector('#searchUf', { timeout: 10000 });
        await page.type('#searchUf', searchValue);
        await page.click('#btn-searchUf');

        await page.waitForSelector('#btn-pagoDeudaEf', { visible: true });
        await page.click('#btn-pagoDeudaEf');
        await this.delay(2000);

        // Verifica si el modal se abrió correctamente
        const modalOpened = await page.waitForSelector('#selVencimiento', { visible: true, timeout: 5000 }).catch(() => false);
        
        if (!modalOpened) {
          console.log(`El cliente con UF ${searchValue} no tiene deudas. Omite la descarga del PDF.`);
          return null; // Retorna null para indicar que no hay PDF que descargar
        }

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
          console.log(`PDF downloaded for search value ${searchValue}:`, pdfPath);
          return pdfPath;
        } else {
          console.error(`Failed to find download URL for search value ${searchValue}.`);
          throw new Error('Failed to find download URL');
        }
      } catch (error) {
        console.error(`Error scraping UF ${searchValue}:`, error);
        throw error; // Lanza el error para que Puppeteer Cluster lo maneje y reintente si es necesario
      }
    });
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async createDownloadsDir(): Promise<string> {
    const downloadsPath = path.join(__dirname, '..', 'downloads');
    if (!fs.existsSync(downloadsPath)) {
      fs.mkdirSync(downloadsPath, { recursive: true });
    }
    return downloadsPath;
  }

  async scrape(searchValue: string): Promise<string | null> {
    try {
      return await this.cluster.execute({ searchValue });
    } catch (error) {
      console.error('Scraping error:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    // Cierra el clúster cuando se destruye el módulo
    await this.cluster.idle();
    await this.cluster.close();
  }
}

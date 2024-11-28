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
  private ufWithoutDebt: string[] = []; // Array para almacenar UFs sin deuda

  constructor(
    @InjectQueue('scraping') private readonly scrapingQueue: Queue,
    private readonly httpService: HttpService
  ) {
    this.initCluster();
  }

  private async initCluster() {
    this.cluster = await Cluster.launch({
      concurrency: Cluster.CONCURRENCY_CONTEXT,
      maxConcurrency: 8, // Define cuántas tareas quieres ejecutar en paralelo
      timeout: 200000, // Aumentar el timeout a 200 segundos
      retryLimit: 3, // Reintentar hasta 3 veces si un trabajo falla
      puppeteerOptions: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true ,
      },
    });

    // Define la tarea que ejecutará cada worker en paralelo
    await this.cluster.task(async ({ page, data: { searchValue,expiration } }) => {
      const downloadsPath = await this.createDownloadsDir();
      console.log(`Processing search value: ${searchValue}`);

      try {
        await this.navigateToPage(page);
        await this.searchForUF(page, searchValue);

        const hasDebt = await this.checkForDebt(page, searchValue);
        if (!hasDebt) return;

        const downloadUrl = await this.selectCheckbox(page , expiration);
        if (!downloadUrl) {
          throw new Error(`No se pudo obtener la URL de descarga para UF ${searchValue}.`);
        }

        const pdfPath = await this.downloadPDF(page, searchValue, downloadsPath, downloadUrl);
        return pdfPath;

      } catch (error) {
        console.error(`Error scraping UF ${searchValue}:`, error);
        this.ufWithoutDebt.push(searchValue); // Guardar el searchValue en ufWithoutDebt si ocurre un error
        throw error;
      }
    });
  }

  // Navega a la página de gestión de deuda
  private async navigateToPage(page: puppeteer.Page) {
    await page.goto('https://www.aguascordobesas.com.ar/espacioClientes/seccion/gestionDeuda', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#searchUf', { timeout: 10000 });
  }

  // Realiza la búsqueda del UF
  private async searchForUF(page: puppeteer.Page, searchValue: string) {
    await page.type('#searchUf', searchValue);
    await page.click('#btn-searchUf');
  }

  // Verifica si el cliente tiene deuda
  private async checkForDebt(page: puppeteer.Page, searchValue: string): Promise<boolean> {
    const btnSelector = '#btn-pagoDeudaEf';
    const btnVisible = await page.waitForSelector(btnSelector, { visible: true }).catch(() => false);

    if (!btnVisible) {
      console.log(`UF ${searchValue} sin deuda, omitiendo descarga.`);
      this.ufWithoutDebt.push(searchValue);
      return false;
    }

    await page.click(btnSelector);
    await this.delay(2000);

    const modalOpened = await page.waitForSelector('#selVencimiento', { visible: true, timeout: 60000 }).catch(() => false);
    if (!modalOpened) {
      console.log(`UF ${searchValue} sin deuda, omitiendo descarga.`);
      this.ufWithoutDebt.push(searchValue);
      return false;
    }

    return true;
  }


  // Método para manejar reintentos
  private async retry<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delayMs: number = 2000
  ): Promise<T> {
    let attempt = 1;
  
    while (attempt <= retries) {
      try {
        return await fn(); // Intentar ejecutar la función
      } catch (error) {
        console.error(`Error en intento ${attempt}/${retries}: ${error.message}`);
        if (attempt === retries) throw error; // Si se agotan los reintentos, relanzar el error
        await this.delay(delayMs); // Esperar antes del próximo intento
      }
      attempt++;
    }
  }
  
  // Selecciona el checkbox y descarga el PDF
  private async selectCheckbox(page: puppeteer.Page, expiration: number): Promise<puppeteer.HTTPResponse | null> {
    return await this.retry(async () => {
      try {
        // Hacer clic en el select box
        await page.click('#selVencimiento');
  
        // Cambiar el valor del select según el parámetro `expiration`
        await page.evaluate((expiration) => {
          const selectElement = document.querySelector<HTMLSelectElement>('#selVencimiento');
          if (selectElement && selectElement.options.length > 1) {
            if (expiration === 0) {
              selectElement.value = selectElement.options[0].value;
            } else {
              selectElement.value = selectElement.options[1].value;
            }
            selectElement.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, expiration);
  
        // Esperar a que el botón esté habilitado y sea visible
        await page.waitForFunction(() => {
          const button = document.querySelector<HTMLButtonElement>('#btn-generarDocRweb');
          return button && !button.disabled && getComputedStyle(button).visibility !== 'hidden';
        }, { timeout: 35000 });
  
        // Hacer clic en el botón para generar el documento
        await page.click('#btn-generarDocRweb');
        await this.delay(2000);
  
        // Verificar si se muestra el modal de resultado
        const resultModalVisible = await page.waitForSelector('#resultModalPagoEf', { visible: true, timeout: 5000 }).catch(() => false);
        if (resultModalVisible) {
          console.log('Intentando añadir nuevas deudas...');
          await this.addDebts(page, expiration);
          throw new Error('Nuevo intento requerido debido a deuda no generada.');
        }
  
        // Esperar a la respuesta de descarga
        const downloadUrl = await page.waitForResponse(
          (response) => response.url().includes('downloadDocDeuda') && response.status() === 200,
          { timeout: 30000 }
        );
  
        return downloadUrl;
      } catch (error) {
        console.error('Error al procesar el checkbox:', error.message);
        throw error; // Lanzar el error para que `retry` maneje el reintento
      }
    });
  }
  


  // Metodo auxliar en caso de que no deje descargar deudas por falta de las mismas.
  private async addDebts(page: puppeteer.Page , expiration: number){
    const resultModalVisible = await page.waitForSelector('#resultModalPagoEf', { visible: true, timeout: 10000 }).catch(() => false);
    console.log("resultModalPagoEf: " + resultModalVisible);
    
    if (resultModalVisible) {
          console.log('El modal de resultado está visible, cerrándolo...');

        // Verificar si algún elemento está sobre el botón de cerrar y dar click
        await page.evaluate(() => {
          const closeButton = document.querySelector('.btn-close') as HTMLElement;
          if (closeButton) {
            const { top, left, width, height } = closeButton.getBoundingClientRect();
            const elementAtPoint = document.elementFromPoint(left + width / 2, top + height / 2);
            closeButton.click();  // Cerrar el modal
          }
        });

        await this.delay(1000);

        console.log('Modal cerrado, procediendo a la selección de la tabla...');

         // Espera a que la tabla esté cargada
        const tableSelector = "tbody.no-more-tables"

        await this.scrollToElement(page, tableSelector);

        await page.waitForSelector(tableSelector);

        // Encuentra la fila que contiene "Cuota Plan Pagos" en la columna "Descripción"
        const rowSelector = 'tbody.no-more-tables tr.no-more-tables';
        const rows = await page.$$(rowSelector);

        for (let row of rows) {
          const description = await row.$eval('td[data-title="Descripción"]', el => el.textContent.trim());
          
          if (description === 'Cuota Plan Pagos') {
            // Encuentra el input dentro de la fila y haz clic en él
            const inputSelector = 'input[id^="itemNoVenc"]';
            const checkboxVisible = await page.waitForSelector(inputSelector, { visible: true, timeout: 10000 }).catch(() => false);


            if (checkboxVisible) {
              console.log('Checkbox encontrado, intentando seleccionar...');
              
              // Intentar hacer clic usando evaluate si click directo falla
              const success = await page.evaluate((inputSelector) => {
                const checkbox = document.querySelector(inputSelector) as HTMLElement;
                if (checkbox) {
                  checkbox.click(); // Forzar clic desde dentro del DOM
                  return true;
                }
                return false;
              }, inputSelector);
            
              if (!success) {
                console.error('No se pudo hacer clic en el checkbox');
                throw new Error('No se pudo hacer clic en el checkbox');
              }
            
              console.log('Checkbox seleccionado con éxito.');
            } else {
              console.error('El checkbox no está visible o no se encontró.');
              throw new Error('El checkbox no está visible o no se encontró');
            }
            break;
          }
              
        }
        
        this.selectCheckbox(page, expiration);
      }
  }


  // Desplaza la página hasta el elemento especificado
  private async scrollToElement(page: puppeteer.Page, selector: string) {
    await page.evaluate((selector) => {
      const element = document.querySelector(selector) as HTMLElement;
      element?.scrollIntoView({ block: 'center', inline: 'center' });
    }, selector);
  }

  // Descarga el PDF asociado
  private async downloadPDF(page: puppeteer.Page, searchValue: string, downloadsPath: string, downloadUrl: puppeteer.HTTPResponse ) {

    if (downloadUrl) {
      const pdfUrl = downloadUrl.url();
      const pdfPath = path.join(downloadsPath, `${searchValue}.pdf`);
      const { data } = await lastValueFrom(this.httpService.get(pdfUrl, { responseType: 'arraybuffer' }));
      fs.writeFileSync(pdfPath, data);
      console.log(`PDF descargado para UF ${searchValue}:`, pdfPath);
      return pdfPath;
    } else {
      throw new Error('No se encontró la URL de descarga');
    }
  }
  

  // Método auxiliar para retrasos
  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Crea el directorio para las descargas
  private async createDownloadsDir(): Promise<string> {
    const downloadsPath = path.join(__dirname, '..', 'downloads');
    if (!fs.existsSync(downloadsPath)) {
      fs.mkdirSync(downloadsPath, { recursive: true });
    }
    return downloadsPath;
  }

  // Método público para iniciar el scraping
  async scrape(searchValue: string, expiration: number): Promise<string | null> {
    try {
      return await this.cluster.execute({ searchValue,expiration });
    } catch (error) {
      console.error('Error durante el scraping:', error);
      throw error;
    }
  }

  // Obtiene las UFs sin deuda
  async getUFsWithoutDebt(): Promise<string[]> {
    return this.ufWithoutDebt;
  }

  // Cierra el clúster al destruir el módulo
  async onModuleDestroy() {
    await this.cluster.idle();
    await this.cluster.close();
  }
}

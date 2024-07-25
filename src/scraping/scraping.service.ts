import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class ScrapingService {
  async scrape(searchValue: string): Promise<string> {
    // Configuraciones específicas para Puppeteer en entornos serverless
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    });

    const page = await browser.newPage();

    // Navega a la página deseada
    await page.goto('https://www.aguascordobesas.com.ar/espacioClientes/seccion/gestionDeuda', { waitUntil: 'networkidle2' });

    // Espera a que el campo de búsqueda esté disponible
    try {
      await page.waitForSelector('#searchUf', { timeout: 10000 });
    } catch (error) {
      console.error('Error al esperar el campo de búsqueda:', error);
      await browser.close();
      return 'Error al esperar el campo de búsqueda';
    }

    // Ingresa el número en el campo de búsqueda
    await page.type('#searchUf', searchValue);
    await page.click("#btn-searchUf");

    // Espera un momento para que se procese la búsqueda
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Espera a que el elemento con el id #gd-ufCliente esté disponible
    try {
      await page.waitForSelector('#gd-ufCliente', { timeout: 10000 });
    } catch (error) {
      console.error('Error al esperar el elemento #gd-ufCliente:', error);
      await browser.close();
      return 'No se encontró el elemento con el id #gd-ufCliente';
    }

    // Extrae el texto del elemento
    const clienteName = await page.$eval('#gd-ufCliente', el => el.textContent);
    console.log('Nombre del cliente:', clienteName);

    // Asegura que el checkbox esté marcado
    const isChecked = await page.evaluate(() => {
      const checkbox = document.querySelector<HTMLInputElement>('#includeVencidos');
      return checkbox ? checkbox.checked : false;
    });

    if (!isChecked) {
      await page.evaluate(() => {
        const checkbox = document.querySelector<HTMLInputElement>('#includeVencidos');
        if (checkbox) checkbox.scrollIntoView();
      });
      try {
        await page.waitForSelector('#includeVencidos', { visible: true });
        await page.click('#includeVencidos');
      } catch (error) {
        console.error('Error al hacer clic en el checkbox #includeVencidos:', error);
      }
    }

    // Abre el modal
    try {
      await page.waitForSelector("#btn-pagoDeudaEf", { visible: true });
      await page.click("#btn-pagoDeudaEf");
    } catch (error) {
      console.error('Error al hacer clic en el botón #btn-pagoDeudaEf:', error);
    }

    // Selecciona la segunda opción en el dropdown
    try {
      await page.waitForSelector("#selVencimiento", { visible: true });
      await page.click("#selVencimiento");

      // Usa page.evaluate para seleccionar la segunda opción
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

      // Espera un momento para asegurarse de que la opción se selecciona correctamente
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Error al seleccionar la fecha de vencimiento:', error);
    }

    // Descarga el documento PDF
    try {
      await page.waitForSelector("#btn-generarDocRweb", { visible: true });
      await page.click("#btn-generarDocRweb");
    } catch (error) {
      console.error('Error al hacer clic en el botón #btn-generarDocRweb:', error);
    }

    // Espera un momento para que se procese la descarga
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Cierra el navegador
    await browser.close();
    return clienteName;
  }
}

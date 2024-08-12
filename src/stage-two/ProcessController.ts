  import { Controller, Post, Param, Get } from '@nestjs/common';
  import * as path from 'path';
  import { FileStorageService } from 'src/file-upload/DB/FileStorageService';
  import { WhatsAppService } from 'src/whatsapp-service/WhatsappService';
  import { ScrapingService } from './scraping/scraping.service';
  import { InjectQueue } from '@nestjs/bull';
  import { Queue } from 'bull';
  import { readExcelFile } from '../../utils/ExcelTools';
  import { emptyDownloadsFolder } from "../../utils/ExcelTools";

  @Controller('process')
  export class ProcessController {
    constructor(
      private readonly fileStorageService: FileStorageService,
      private readonly scrapingService: ScrapingService,
      private readonly whatsAppService: WhatsAppService,
      @InjectQueue('scraping') private readonly scrapingQueue: Queue,
      @InjectQueue('whatsapp') private readonly whatsappQueue: Queue
    ) {}

    @Post('process-file/:fileName')
    async processFile(@Param('fileName') fileName: string): Promise<void> {
      // Retrieve the file path from the storage service
      const filePath = await this.fileStorageService.getFilePath(fileName);
      const downloadsPath = path.join(__dirname, '..', 'stage-two/downloads');
      
      // Read the Excel file and extract data
      const jsonData = readExcelFile(filePath);

      // Skip the first row (headers) by using slice(1)
      for (const row of jsonData.slice(1)) {
        const clientUF = row[0]?.toString().trim(); // Ensure clientUF is a string
        const clientPhoneNumber = row[1]?.toString().trim() || row[2]?.toString().trim(); // Prioritize column 1
        const clientName = row[6]?.toString().trim();

        // Validate the phone number
        if (clientPhoneNumber && clientPhoneNumber.startsWith('549351')) {
          try {
            // Add the scraping job to the queue
            const pdfPath = await this.scrapingService.scrape(clientUF);
            
            if (pdfPath) {
              await this.whatsAppService.sendPDF(clientPhoneNumber, clientName, pdfPath);

              emptyDownloadsFolder(downloadsPath);
            } else {
              console.error(`Failed to download PDF for UF: ${clientUF}`);
            }
          } catch (error) {
            console.error(`Error scraping UF ${clientUF}:`, error);
          }
        } else {
          console.warn(`Invalid or missing phone number for UF: ${clientUF}, row: ${row}`);
        }
      }

      console.log("Process Controller Service End");
      
    }

    @Get('status')
    async getStatus() {
      // Retrieve the job counts from the scraping and WhatsApp queues
      const scrapingJobs = await this.scrapingQueue.getJobCounts();
      const whatsappJobs = await this.whatsappQueue.getJobCounts();

      return {
        scraping: scrapingJobs,
        whatsapp: whatsappJobs,
      };
    }
  }

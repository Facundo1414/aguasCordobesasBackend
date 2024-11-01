// dto/process-file.dto.ts
import { IsString, IsNumber } from 'class-validator';

export class ProcessFileDto {
  @IsString()
  filename: string;

  @IsString()
  message: string;

  @IsNumber()
  expiration: number;
}

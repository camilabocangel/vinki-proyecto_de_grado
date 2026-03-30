import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class IngestDocumentDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsOptional()
  sourceUrl?: string;

  @IsInt()
  @IsOptional()
  languageId?: number;

  @IsInt()
  @IsOptional()
  frameworkId?: number;
}

import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class SearchKnowledgeDto {
  @IsString()
  @IsNotEmpty()
  query!: string;

  @IsInt()
  @IsOptional()
  languageId?: number;

  @IsInt()
  @IsOptional()
  frameworkId?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(20)
  limit?: number;
}

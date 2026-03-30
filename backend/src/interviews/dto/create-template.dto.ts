import { IsInt, IsOptional, IsString, IsBoolean, IsArray, ArrayMinSize, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  description!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  companyType!: string;

  @ApiProperty()
  @IsInt()
  roleId!: number;

  @ApiProperty()
  @IsInt()
  levelId!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  languageId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  frameworkId?: number;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  questionIds!: number[];
}

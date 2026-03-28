import { IsInt, IsOptional, IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInterviewDto {
  @ApiProperty()
  @IsInt()
  roleId!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  languageId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  frameworkId?: number;

  @ApiProperty()
  @IsInt()
  chosenLevelId!: number;

  @ApiProperty({ required: false, default: 'evaluation' })
  @IsOptional()
  @IsString()
  @IsIn(['practice', 'evaluation'])
  mode?: string;
}

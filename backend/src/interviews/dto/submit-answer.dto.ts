import { IsOptional, IsString, IsNumber, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitAnswerDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  answerText?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  audioUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  answeredInSeconds?: number;
}

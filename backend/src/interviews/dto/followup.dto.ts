import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FollowUpRequestDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  answerText!: string;
}

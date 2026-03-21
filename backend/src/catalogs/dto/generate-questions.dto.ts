import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class GenerateQuestionsDto {
  @IsString()
  @IsNotEmpty()
  topic!: string;

  @IsString()
  @IsNotEmpty()
  level!: string;

  @IsString()
  @IsNotEmpty()
  language!: string;

  @IsInt()
  @Min(1)
  @Max(10)
  count!: number;
}

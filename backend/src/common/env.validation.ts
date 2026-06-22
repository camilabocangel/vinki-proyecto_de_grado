import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  REDIS_URL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_PRIVATE_KEY!: string;

  @IsString()
  @IsNotEmpty()
  JWT_PUBLIC_KEY!: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRATION?: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRATION?: string;

  @IsString()
  @IsOptional()
  OPENAI_API_KEY?: string;

  @IsString()
  @IsOptional()
  LLM_SANDBOX?: string;

  @IsString()
  @IsOptional()
  LLM_EMBEDDING_PROVIDER?: string;

  @IsString()
  @IsOptional()
  LLM_TEXT_PROVIDER?: string;

  @IsString()
  @IsOptional()
  GOOGLE_AI_API_KEY?: string;

  @IsString()
  @IsOptional()
  EMBEDDING_DIMENSIONS?: string;

  @IsString()
  @IsOptional()
  AWS_S3_BUCKET?: string;

  @IsString()
  @IsOptional()
  AWS_S3_ENDPOINT?: string;

  @IsString()
  @IsOptional()
  AWS_REGION?: string;

  @IsString()
  @IsOptional()
  FRONTEND_URL?: string;

  @IsString()
  @IsOptional()
  GMAIL_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  GMAIL_CLIENT_SECRET?: string;

  @IsString()
  @IsOptional()
  GMAIL_REFRESH_TOKEN?: string;

  @IsString()
  @IsOptional()
  GMAIL_SENDER_EMAIL?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}

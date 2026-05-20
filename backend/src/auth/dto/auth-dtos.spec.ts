import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto.js';
import { LoginDto } from './login.dto.js';
import { ChangePasswordDto } from './change-password.dto.js';
import { UpdateProfileDto } from './update-profile.dto.js';

// Helper: ejecuta el pipeline real de class-transformer + class-validator
// (el mismo que usa NestJS en el ValidationPipe global).
async function validateDto<T extends object>(
  dtoClass: new () => T,
  payload: unknown,
): Promise<Array<string>> {
  const instance = plainToInstance(dtoClass, payload);
  const errors = await validate(instance as object);
  return errors.flatMap((e) => Object.keys(e.constraints ?? {}));
}

describe('RegisterDto', () => {
  const valid = { name: 'Jane Doe', email: 'jane@vinki.dev', password: 'password123' };

  it('should validate a complete payload', async () => {
    const errors = await validateDto(RegisterDto, valid);
    expect(errors).toEqual([]);
  });

  it('should reject when name is empty', async () => {
    const errors = await validateDto(RegisterDto, { ...valid, name: '' });
    expect(errors).toContain('isNotEmpty');
  });

  it('should reject when name exceeds 255 characters', async () => {
    const errors = await validateDto(RegisterDto, { ...valid, name: 'a'.repeat(256) });
    expect(errors).toContain('maxLength');
  });

  it('should reject when email is not a valid email', async () => {
    const errors = await validateDto(RegisterDto, { ...valid, email: 'not-an-email' });
    expect(errors).toContain('isEmail');
  });

  it('should reject when password is shorter than 8 characters (RNF-05 baseline)', async () => {
    const errors = await validateDto(RegisterDto, { ...valid, password: '1234567' });
    expect(errors).toContain('minLength');
  });

  it('should reject when password is not a string', async () => {
    const errors = await validateDto(RegisterDto, { ...valid, password: 12345678 });
    expect(errors).toContain('isString');
  });
});

describe('LoginDto', () => {
  it('should validate with valid email and string password', async () => {
    const errors = await validateDto(LoginDto, {
      email: 'jane@vinki.dev',
      password: 'whatever',
    });
    expect(errors).toEqual([]);
  });

  it('should reject when email is invalid', async () => {
    const errors = await validateDto(LoginDto, {
      email: 'no-arroba',
      password: 'whatever',
    });
    expect(errors).toContain('isEmail');
  });

  it('should reject when password is not a string', async () => {
    const errors = await validateDto(LoginDto, {
      email: 'jane@vinki.dev',
      password: 12345,
    });
    expect(errors).toContain('isString');
  });
});

describe('ChangePasswordDto', () => {
  const valid = { currentPassword: 'old-secret', newPassword: 'new-secret-12' };

  it('should validate when both fields are strings and newPassword has 6+ chars', async () => {
    const errors = await validateDto(ChangePasswordDto, valid);
    expect(errors).toEqual([]);
  });

  it('should reject when newPassword is shorter than 6 characters', async () => {
    const errors = await validateDto(ChangePasswordDto, {
      ...valid,
      newPassword: '12345',
    });
    expect(errors).toContain('minLength');
  });

  it('should reject when currentPassword is not a string', async () => {
    const errors = await validateDto(ChangePasswordDto, {
      currentPassword: 1234,
      newPassword: 'new-secret-12',
    });
    expect(errors).toContain('isString');
  });
});

describe('UpdateProfileDto', () => {
  it('should validate an empty payload (both fields are optional)', async () => {
    const errors = await validateDto(UpdateProfileDto, {});
    expect(errors).toEqual([]);
  });

  it('should validate when only name is provided and has 2+ characters', async () => {
    const errors = await validateDto(UpdateProfileDto, { name: 'Jo' });
    expect(errors).toEqual([]);
  });

  it('should reject when name has fewer than 2 characters', async () => {
    const errors = await validateDto(UpdateProfileDto, { name: 'J' });
    expect(errors).toContain('minLength');
  });

  it('should reject when name exceeds 255 characters', async () => {
    const errors = await validateDto(UpdateProfileDto, { name: 'a'.repeat(256) });
    expect(errors).toContain('maxLength');
  });

  it('should reject when email has invalid format', async () => {
    const errors = await validateDto(UpdateProfileDto, { email: 'invalid' });
    expect(errors).toContain('isEmail');
  });
});

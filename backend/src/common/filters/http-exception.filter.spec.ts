import {
  HttpException,
  HttpStatus,
  ArgumentsHost,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GlobalExceptionFilter } from './http-exception.filter.js';

// El filtro global transforma cualquier excepción en una respuesta JSON
// con la estructura `{statusCode, message, error}`. Cubre los tres
// caminos: HttpException con string, HttpException con objeto, y
// excepción genérica (debe degradar a 500 sin filtrar el mensaje real).

function buildHost(): { host: ArgumentsHost; res: { status: jest.Mock; json: jest.Mock } } {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const host = {
    switchToHttp: () => ({
      getResponse: () => res,
      getRequest: () => ({}),
      getNext: () => undefined,
    }),
  } as unknown as ArgumentsHost;
  return { host, res };
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
  });

  it('should map an HttpException with a string response to {statusCode, message}', () => {
    const { host, res } = buildHost();

    filter.catch(new BadRequestException('Invalid input'), host);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid input',
      }),
    );
  });

  it('should map an HttpException with an object response to its message/error fields', () => {
    const { host, res } = buildHost();
    const exception = new HttpException(
      { message: 'Token expirado', error: 'TokenExpired' },
      HttpStatus.UNAUTHORIZED,
    );

    filter.catch(exception, host);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    const payload = res.json.mock.calls[0][0];
    expect(payload.statusCode).toBe(HttpStatus.UNAUTHORIZED);
    expect(payload.message).toBe('Token expirado');
    expect(payload.error).toBe('TokenExpired');
  });

  it('should default to 500 and "Internal Server Error" for non-HTTP exceptions (no stack leak)', () => {
    const { host, res } = buildHost();

    filter.catch(new Error('SECRET_KEY=xyz failed'), host);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const payload = res.json.mock.calls[0][0];
    expect(payload.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(payload.message).toBe('Internal server error');
    expect(payload.error).toBe('Internal Server Error');
    // No debe filtrar el stack ni el mensaje real al cliente (RNF-24).
    expect(JSON.stringify(payload)).not.toContain('SECRET_KEY');
  });

  it('should handle NotFoundException (404)', () => {
    const { host, res } = buildHost();

    filter.catch(new NotFoundException('Interview not found'), host);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: 'Interview not found' }),
    );
  });

  it('should handle UnauthorizedException (401)', () => {
    const { host, res } = buildHost();

    filter.catch(new UnauthorizedException(), host);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
  });
});

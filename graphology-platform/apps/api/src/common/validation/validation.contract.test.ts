import { IsEmail, IsString, MinLength } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';

class SampleDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

describe('ValidationPipe contract', () => {
  it('rejects invalid payloads', async () => {
    const dto = plainToInstance(SampleDto, {
      email: 'not-an-email',
      password: 'short',
      unexpected: true,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts valid payloads', async () => {
    const dto = plainToInstance(SampleDto, {
      email: 'admin@graphology.local',
      password: 'SecurePass1!',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

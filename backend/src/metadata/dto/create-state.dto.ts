import { Transform, TransformFnParams } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';

export class CreateStateDto {
  @IsString()
  @MinLength(2)
  // FIX: Type the params as TransformFnParams and ensure the return is a string
  @Transform(({ value }: TransformFnParams): string => (typeof value === 'string' ? value.trim() : (value as string)))
  name: string;
}
